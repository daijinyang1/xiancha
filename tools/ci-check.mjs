#!/usr/bin/env node
/**
 * 先查 · 静态产物回归门禁（本地与 GitHub Actions 共用同一套断言）
 *
 * 为什么要有它：改一行 CSS / 一个页面模板，都可能悄悄把线上打坏 ——
 * 静态预渲染最容易坏的四种方式（后端未连接黄条、127.0.0.1 泄漏、
 * 404 退化成空壳、sitemap 掉条目）在浏览器里都「看起来正常」，
 * 只有对产物做断言才拦得住。所以断言一律针对 `.out/` 的最终产物，
 * 不针对源码，也不依赖某个人新加的图片/类名。
 *
 * 用法：
 *   node tools/build-site.mjs .out            # 先构建
 *   node tools/ci-check.mjs                   # 再断言（默认检查 .out）
 *   node tools/ci-check.mjs --log .ci/build.log   # 顺带校验构建日志里的路由数
 *   node tools/ci-check.mjs --out .stage      # 换一个产物目录
 *
 * 退出码：全部通过 0；有 FAIL 1。
 *
 * 断言口径刻意「只锁核心指标」：路由数、两条 grep、404 字节、sitemap 条数、
 * 首页字数、页面齐不齐、CSS 时长。别人往 web/ 里加组件、改配色、加图片，
 * 只要这几条还成立就算过；反过来，把规则页从 63 条删到 40 条就会红。
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

// ---- 命令行参数：一律 key=value 或 --key=value（PowerShell 会吞空字符串参数）----
const argv = process.argv.slice(2)
const argOf = (name, fallback) => {
  const inline = argv.find((a) => a.startsWith(`--${name}=`))
  if (inline) return inline.slice(inline.indexOf('=') + 1)
  const i = argv.indexOf(`--${name}`)
  if (i < 0) return fallback
  const next = argv[i + 1]
  return next && !next.startsWith('--') ? next : fallback
}

const OUT = path.resolve(ROOT, argOf('out', '.out'))
const LOG = argOf('log', '')

// ---- 门槛值：都是「不满足就该拦住上线」的硬指标，改这里等于改验收口径 ----
const MIN_ROUTES = 146 // nitro 预渲染 written 条目数（74 路由 × html+payload 口径）
const MIN_ROUTES_NO_LOG = 140 // 没有构建日志时按产物估算的下限
const MIN_LOCS = 71 // sitemap 里 <loc> 条数（8 个主页面 + 63 条规则）
const MIN_404_BYTES = 8000 // Nuxt 自带 404 空壳约 1072B，低于 8000 说明没顶替成功
const MIN_INDEX_CHARS = 2000 // 首页正文（去标签去脚本）至少这么多字，否则等于白页
const MIN_RULE_PAGE_BYTES = 5000 // 每条规则页至少这么大，空壳约 1KB
const MIN_FILES = 160 // 产物文件总数（基线 170～176，留余量给别人加资源文件）
const MAIN_CSS_MAX_MS = 700 // main.css 里非循环动画/过渡的上限（入场 620ms 是既有白名单）
const OTHER_CSS_MAX_MS = 1000 // 其它 css（比如并行在加的 motion.css）放宽到 1s

// ---- 小工具 ----
const results = []
function record(name, ok, detail) {
  results.push({ name, ok, detail })
  const tag = ok ? '\x1b[32mPASS\x1b[0m' : '\x1b[31mFAIL\x1b[0m'
  console.log(`[${tag}] ${String(results.length).padStart(2, '0')}. ${name}`)
  if (detail) console.log(`        ${detail}`)
}

function walk(dir, acc = []) {
  if (!fs.existsSync(dir)) return acc
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name)
    if (e.isDirectory()) walk(p, acc)
    else acc.push(p)
  }
  return acc
}

const rel = (p) => path.relative(ROOT, p).split(path.sep).join('/')
const bytes = (p) => (fs.existsSync(p) ? fs.statSync(p).size : -1)
const read = (p) => (fs.existsSync(p) ? fs.readFileSync(p, 'utf8') : null)

/** 把 HTML 变成「人眼能看到的正文」：先剔 script/style，再去标签，最后还原常见实体。 */
function visibleText(html) {
  const decoded = html
    .replace(/<script\b[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style\b[\s\S]*?<\/style>/gi, ' ')
    .replace(/<noscript\b[\s\S]*?<\/noscript>/gi, ' ')
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&(amp|lt|gt|quot|#39|apos);/gi, ' ')
    .replace(/&#\d+;/g, ' ')
  return decoded.replace(/\s+/gu, '')
}

/** 扫一份 CSS 里所有 transition/animation 声明，返回 [{file,line,prop,value,maxMs,loop}] */
function scanCssDurations(file) {
  const raw = fs.readFileSync(file, 'utf8')
  const css = raw.replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, ' '))
  const found = []
  const re = /(?:^|[;{}])\s*(transition|animation)(-[a-z]+)?\s*:\s*([^;{}]+)/gi
  let m
  while ((m = re.exec(css)) !== null) {
    const value = m[3].replace(/\s+/g, ' ').trim()
    const loop = /\binfinite\b/i.test(value) // 循环装饰动画（呼吸灯/流光）不受入场时长约束
    const decl = m[0]
    if (/^none\b/i.test(value) || /!important/i.test(value)) {
      const bare = value.replace(/!important/gi, '').trim()
      if (/^none\b/i.test(bare)) continue
    }
    let maxMs = 0
    // 只认「数字 + s/ms」，var(--duration-*) 这类令牌不算（令牌本身在 @theme 里定义、单独受约束）
    const timeRe = /(\d+(?:\.\d+)?)(ms|s)\b/gi
    let t
    while ((t = timeRe.exec(value)) !== null) {
      const ms = t[2].toLowerCase() === 'ms' ? Number(t[1]) : Number(t[1]) * 1000
      if (ms > maxMs) maxMs = ms
    }
    if (maxMs === 0) continue
    const line = raw.slice(0, m.index + decl.indexOf(m[1])).split('\n').length
    found.push({ file, line, prop: m[1].toLowerCase() + (m[2] || ''), value, maxMs, loop })
  }
  return found
}

console.log('先查 · CI 回归门禁')
console.log(`产物目录：${rel(OUT)}   项目根：${ROOT}`)
console.log(`构建日志：${LOG ? rel(path.resolve(ROOT, LOG)) : '（未提供，路由数按产物估算）'}`)
console.log('')

// ── 01 数据快照：CI 没有 Postgres，构建只能吃仓库里的三份快照 ─────────────────
{
  const need = ['rules', 'traps', 'certs']
  const bad = []
  for (const n of need) {
    const p = path.join(ROOT, 'web', 'app', 'data', n + '.json')
    if (!fs.existsSync(p)) {
      bad.push(`${n}.json 不存在`)
      continue
    }
    try {
      const rows = JSON.parse(fs.readFileSync(p, 'utf8'))
      if (!Array.isArray(rows) || rows.length === 0) bad.push(`${n}.json 是空数组`)
      else if (!rows.every((r) => typeof r.id === 'string')) bad.push(`${n}.json 有空 id`)
    } catch (e) {
      bad.push(`${n}.json 不是合法 JSON：${e.message}`)
    }
  }
  record(
    '数据快照三份齐全（CI 无 Postgres，靠它构建）',
    bad.length === 0,
    bad.length ? bad.join('；') + '（本地跑 node tools/db-export.mjs，然后提交）' : 'web/app/data/{rules,traps,certs}.json 均有数据',
  )
}

// ── 02 产物存在 + 文件数 ──────────────────────────────────────────────────────
{
  const files = walk(OUT)
  record(
    '产物存在且文件数达标',
    files.length >= MIN_FILES,
    `${rel(OUT)} 下 ${files.length} 个文件（门槛 ${MIN_FILES}）`,
  )
}

// ── 03 预渲染路由数：优先读构建日志的 "Prerendered N routes" ──────────────────
{
  let routes = -1
  let source = ''
  if (LOG) {
    const logPath = path.resolve(ROOT, LOG)
    const text = read(logPath)
    if (text) {
      const clean = text.replace(/\x1b\[[0-9;]*m/g, '') // 去掉 nitro 的 ANSI 配色
      const m = clean.match(/Prerendered\s+(\d+)\s+routes/)
      if (m) {
        routes = Number(m[1])
        source = `日志 ${rel(logPath)}：Prerendered ${routes} routes`
      } else {
        source = `日志 ${rel(logPath)} 里没有 "Prerendered N routes"`
      }
    } else {
      source = `日志 ${rel(logPath)} 读不出来`
    }
  }
  let threshold = MIN_ROUTES
  if (routes < 0 && LOG) {
    // 显式给了 --log 就必须从日志里读到路由数 —— 悄悄退回「按产物估算」等于给门禁
    // 开了一个后门：构建日志缺失/格式变了的时候，检查反而更宽松了。宁可红。
    record('预渲染路由数达标', false, `${source}；无法确认预渲染是否完整（门槛 ${threshold}），请检查构建日志`)
  } else {
    if (routes < 0) {
      const htmls = walk(OUT).filter((p) => p.endsWith('.html') && path.basename(p) !== '200.html')
      const payloads = walk(OUT).filter((p) => path.basename(p) === '_payload.json')
      routes = htmls.length + payloads.length
      threshold = MIN_ROUTES_NO_LOG
      source = `无可用日志，按产物估算 ${htmls.length} 个 html + ${payloads.length} 个 payload`
    }
    record('预渲染路由数达标', routes >= threshold, `${source}（门槛 ${threshold}）`)
  }
}

// ── 04/05 两条 grep：后端未连接黄条 / 本地地址泄漏 ────────────────────────────
function grepHtml(needle) {
  const hits = []
  for (const p of walk(OUT)) {
    if (!p.endsWith('.html')) continue
    const t = fs.readFileSync(p, 'utf8')
    if (t.includes(needle)) hits.push(rel(p))
  }
  return hits
}
{
  const hits = grepHtml('后端未连接')
  record('产物无「后端未连接」降级黄条', hits.length === 0, hits.length ? `命中 ${hits.length} 个文件：${hits.slice(0, 5).join('、')}` : '0 个 html 命中')
}
{
  const hits = grepHtml('127.0.0.1:8080')
  record('产物无 127.0.0.1:8080 本地地址泄漏', hits.length === 0, hits.length ? `命中 ${hits.length} 个文件：${hits.slice(0, 5).join('、')}` : '0 个 html 命中')
}

// ── 06 404.html：必须是被 not-found 页面顶替过的那一版 ────────────────────────
{
  const p = path.join(OUT, '404.html')
  const size = bytes(p)
  const chars = size > 0 ? visibleText(fs.readFileSync(p, 'utf8')).length : 0
  record(
    '404.html 存在且不是空壳',
    size > MIN_404_BYTES && chars > 200,
    size < 0 ? '文件不存在' : `${size} 字节 / 正文 ${chars} 字（门槛 >${MIN_404_BYTES} 字节且正文 >200 字）`,
  )
}

// ── 07 sitemap 条目数 ────────────────────────────────────────────────────────
{
  const p = path.join(OUT, 'sitemap.xml')
  const xml = read(p)
  const locs = xml ? (xml.match(/<loc>/g) || []).length : -1
  record('sitemap.xml 条目数达标', locs >= MIN_LOCS, locs < 0 ? 'sitemap.xml 不存在' : `${locs} 条 <loc>（门槛 ${MIN_LOCS}）`)
}

// ── 08 首页正文字数（预渲染不塌成白页） ──────────────────────────────────────
{
  const p = path.join(OUT, 'index.html')
  const html = read(p)
  const chars = html ? visibleText(html).length : -1
  record(
    '首页正文非白页',
    chars >= MIN_INDEX_CHARS,
    chars < 0 ? 'index.html 不存在' : `正文 ${chars} 字（门槛 ${MIN_INDEX_CHARS}）`,
  )
}

// ── 09 页面齐全：8 个主页面 + 每条规则页都得有内容 ───────────────────────────
{
  const mains = ['index', 'scan', 'traps', 'rules', 'certs', 'about', 'history', 'stats']
  const missing = mains.filter((n) => bytes(path.join(OUT, n + '.html')) <= 0)
  let ruleIds = []
  try {
    ruleIds = JSON.parse(fs.readFileSync(path.join(ROOT, 'web', 'app', 'data', 'rules.json'), 'utf8')).map((r) => r.id)
  } catch {
    ruleIds = []
  }
  const thin = []
  for (const id of ruleIds) {
    const size = bytes(path.join(OUT, 'rules', id + '.html'))
    if (size < MIN_RULE_PAGE_BYTES) thin.push(`${id}${size < 0 ? '缺失' : `仅 ${size}B`}`)
  }
  const ok = missing.length === 0 && ruleIds.length > 0 && thin.length === 0
  const detail = []
  detail.push(missing.length ? `主页面缺：${missing.join('、')}` : '8 个主页面齐全')
  detail.push(ruleIds.length ? `${ruleIds.length} 条规则页均 >${MIN_RULE_PAGE_BYTES}B` : '读不到 rules.json')
  if (thin.length) detail.push(`不合格：${thin.slice(0, 6).join('、')}${thin.length > 6 ? ` 等 ${thin.length} 条` : ''}`)
  record('8 个主页面 + 全部规则页齐全且有正文', ok, detail.join('；'))
}

// ── 10 CSS 动画/过渡时长没失控 ───────────────────────────────────────────────
{
  const cssDir = path.join(ROOT, 'web', 'app', 'assets', 'css')
  const files = fs.existsSync(cssDir) ? fs.readdirSync(cssDir).filter((f) => f.endsWith('.css')) : []
  const violations = []
  const warnings = []
  let scanned = 0
  for (const f of files) {
    const p = path.join(cssDir, f)
    const limit = f === 'main.css' ? MAIN_CSS_MAX_MS : OTHER_CSS_MAX_MS
    for (const d of scanCssDurations(p)) {
      scanned++
      if (d.loop) continue // 循环装饰动画（呼吸灯、流光）本来就长，不算失控
      if (d.maxMs > limit) {
        violations.push(`${rel(p)}:${d.line} ${d.prop}: ${(d.maxMs / 1000).toFixed(2)}s > ${(limit / 1000).toFixed(2)}s`)
      } else if (d.maxMs > MAIN_CSS_MAX_MS && f !== 'main.css') {
        warnings.push(`${rel(p)}:${d.line} ${d.maxMs}ms（放宽带，建议收到 620ms 入场档）`)
      }
    }
  }
  const ok = files.length > 0 && violations.length === 0
  const detail = files.length === 0
    ? 'web/app/assets/css 下没有 css 文件'
    : `扫 ${files.length} 份 css / ${scanned} 条 transition+animation 声明（main.css 上限 ${MAIN_CSS_MAX_MS}ms，其它 ${OTHER_CSS_MAX_MS}ms，循环动画豁免）` +
      (violations.length ? `；超限：${violations.join('；')}` : '；无超限') +
      (warnings.length ? `；提示：${warnings.slice(0, 3).join('；')}` : '')
  record('CSS 动画/过渡时长合规', ok, detail)
}

// ── 汇总 ────────────────────────────────────────────────────────────────────
const failed = results.filter((r) => !r.ok)
const passed = results.length - failed.length
console.log('')
console.log(`汇总：${passed}/${results.length} 项通过${failed.length ? `，${failed.length} 项失败` : ''}`)
if (failed.length) {
  console.log('失败项：')
  for (const f of failed) console.log(`  ✗ ${f.name} — ${f.detail}`)
  process.exit(1)
}
console.log('全部通过：产物可以上线。')
