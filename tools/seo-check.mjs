#!/usr/bin/env node
// SEO / 分享体验自检 —— 对着构建产物逐页核对 head 与结构化数据。
//
// 为什么单独写一个：SEO 的错法几乎都是「静默的」—— 少一条 og:image、canonical 全站指首页、
// JSON-LD 拼错一个逗号，页面照常 200、浏览器照常显示，只有发到微信群里才发现是白板。
// 所以验收不靠肉眼看，靠这个脚本把每一项都断言出来。
//
// 用法（项目根执行）：
//   node tools/build-site.mjs .out        # 先产出
//   node tools/seo-check.mjs .out         # 再自检；不传目录默认 .out
//
// 退出码 0 = 全过；1 = 有失败项（失败项逐条打印）。

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const DIR = path.resolve(ROOT, process.argv[2] || '.out')
const ORIGIN = 'https://xiancha.pages.dev'

let fail = 0
const ok = (msg) => console.log('  ✓ ' + msg)
const bad = (msg) => {
  fail++
  console.log('  ✗ ' + msg)
}

if (!fs.existsSync(DIR)) {
  console.error(`目录不存在：${DIR}\n先跑 node tools/build-site.mjs .out`)
  process.exit(1)
}

/** 递归找产物里的 .html（跳过 _nuxt 与 _payload.json） */
function walkHtml(dir, acc = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name)
    if (e.isDirectory()) {
      if (e.name === '_nuxt') continue
      walkHtml(p, acc)
    } else if (e.name.endsWith('.html')) acc.push(p)
  }
  return acc
}

const one = (s, re) => {
  const m = s.match(re)
  return m ? m[1] : null
}

function ldTypes(html) {
  const types = []
  let broken = 0
  const re = /<script type="application\/ld\+json">([\s\S]*?)<\/script>/g
  let m
  while ((m = re.exec(html))) {
    try {
      const o = JSON.parse(m[1])
      const t = Array.isArray(o) ? o.map((x) => x['@type']).join('+') : o['@type']
      types.push(String(t))
    } catch {
      broken++
    }
  }
  return { types, broken }
}

const htmlFiles = walkHtml(DIR)
console.log(`\n目录：${path.relative(ROOT, DIR) || DIR}   HTML：${htmlFiles.length} 个\n`)

/* ---------- 1. 静态资源 ---------- */
console.log('[1] 静态资源')
const assets = [
  ['og-cover.png', 30 * 1024],
  ['apple-touch-icon.png', 1],
  ['icon-192.png', 1],
  ['icon-512.png', 1],
  ['manifest.webmanifest', 100],
  ['robots.txt', 50],
  ['sitemap.xml', 100],
]
for (const [name, min] of assets) {
  const p = path.join(DIR, name)
  if (!fs.existsSync(p)) bad(`缺文件 ${name}`)
  else {
    const size = fs.statSync(p).size
    if (size < min) bad(`${name} 只有 ${size} 字节（应 ≥ ${min}）`)
    else ok(`${name} ${size} 字节`)
  }
}

/* ---------- 2. og 图尺寸 ---------- */
console.log('\n[2] og 图尺寸（PNG IHDR，不引依赖）')
try {
  const buf = fs.readFileSync(path.join(DIR, 'og-cover.png'))
  const sig = buf.subarray(0, 8).toString('hex')
  const w = buf.readUInt32BE(16)
  const h = buf.readUInt32BE(20)
  if (sig !== '89504e470d0a1a0a') bad('og-cover.png 不是 PNG')
  else if (w !== 1200 || h !== 630) bad(`og-cover.png 尺寸 ${w}×${h}（应为 1200×630）`)
  else ok(`og-cover.png ${w}×${h}`)
} catch (e) {
  bad('读不了 og-cover.png：' + e.message)
}

/* ---------- 3. manifest 可解析且图标齐 ---------- */
console.log('\n[3] manifest.webmanifest')
try {
  const mf = JSON.parse(fs.readFileSync(path.join(DIR, 'manifest.webmanifest'), 'utf8'))
  const need = ['name', 'short_name', 'start_url', 'display', 'theme_color', 'background_color', 'lang', 'icons']
  const lacking = need.filter((k) => !mf[k])
  if (lacking.length) bad('缺字段：' + lacking.join(', '))
  else ok(`字段齐全 lang=${mf.lang} display=${mf.display}`)
  if (mf.theme_color !== '#1F4E79') bad(`theme_color=${mf.theme_color}（应为 #1F4E79）`)
  else ok('theme_color #1F4E79')
  for (const ic of mf.icons || []) {
    const p = path.join(DIR, ic.src.replace(/^\//, ''))
    if (!fs.existsSync(p)) bad(`manifest 图标不存在：${ic.src}`)
  }
  ok(`icons ${(mf.icons || []).length} 个且文件都在`)
} catch (e) {
  bad('manifest 解析失败：' + e.message)
}

/* ---------- 4. robots ---------- */
console.log('\n[4] robots.txt')
const robots = fs.readFileSync(path.join(DIR, 'robots.txt'), 'utf8')
for (const [label, re] of [
  ['User-agent: *', /User-agent:\s*\*/],
  ['Allow: /', /Allow:\s*\//],
  ['Disallow: /api/', /Disallow:\s*\/api\//],
  ['Disallow: /_nuxt/', /Disallow:\s*\/_nuxt\//],
  ['Sitemap 指向本站', /Sitemap:\s*https:\/\/xiancha\.pages\.dev\/sitemap\.xml/],
]) {
  if (re.test(robots)) ok(label)
  else bad('robots 缺 ' + label)
}

/* ---------- 5. sitemap ---------- */
console.log('\n[5] sitemap.xml')
const sitemap = fs.readFileSync(path.join(DIR, 'sitemap.xml'), 'utf8')
const locs = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1])
if (locs.length < 70) bad(`sitemap 只有 ${locs.length} 条（应 ≥ 70）`)
else ok(`${locs.length} 条 URL`)
const offsite = locs.filter((u) => !u.startsWith(ORIGIN))
if (offsite.length) bad(`sitemap 里有域名不对的：${offsite.slice(0, 3).join(', ')}`)
else ok('全部指向 ' + ORIGIN)
const dup = locs.filter((u, i) => locs.indexOf(u) !== i)
if (dup.length) bad(`sitemap 有重复：${dup.slice(0, 3).join(', ')}`)
else ok('无重复 URL')

/* ---------- 6. 逐页 head ---------- */
console.log('\n[6] 逐页 head（canonical / og / twitter）')
const canonicals = new Map()
const problems = []
for (const f of htmlFiles) {
  const rel = path.relative(DIR, f).split(path.sep).join('/')
  const base = path.basename(rel)
  // Nuxt 的 200.html / 404.html 是 SPA 壳，不参与（真实 404 由 not-found.html 顶替）
  if (base === '200.html' || base === '404.html') continue
  const html = fs.readFileSync(f, 'utf8')

  const canonical = one(html, /<link rel="canonical" href="([^"]+)"/)
  const ogUrl = one(html, /property="og:url" content="([^"]+)"/)
  const ogTitle = one(html, /property="og:title" content="([^"]+)"/)
  const ogImage = one(html, /property="og:image" content="([^"]+)"/)
  const ogDesc = one(html, /property="og:description" content="([^"]+)"/)
  const twCard = one(html, /name="twitter:card" content="([^"]+)"/)
  const desc = one(html, /name="description" content="([^"]+)"/)
  const ld = ldTypes(html)

  if (!canonical) problems.push(`${rel}: 无 canonical`)
  else if (!canonical.startsWith(ORIGIN)) problems.push(`${rel}: canonical 不是绝对地址 ${canonical}`)
  if (canonical && ogUrl && canonical !== ogUrl) problems.push(`${rel}: canonical≠og:url (${canonical} / ${ogUrl})`)
  if (!ogTitle) problems.push(`${rel}: 无 og:title`)
  if (!ogImage) problems.push(`${rel}: 无 og:image`)
  if (ogImage && ogImage !== ORIGIN + '/og-cover.png') problems.push(`${rel}: og:image=${ogImage}`)
  if (!ogDesc) problems.push(`${rel}: 无 og:description`)
  if (twCard !== 'summary_large_image') problems.push(`${rel}: twitter:card=${twCard}`)
  if (!desc) problems.push(`${rel}: 无 description`)
  if (ld.broken) problems.push(`${rel}: 有 ${ld.broken} 段 JSON-LD 解析失败`)

  if (canonical) {
    if (canonicals.has(canonical)) problems.push(`${rel}: canonical 与 ${canonicals.get(canonical)} 重复`)
    else canonicals.set(canonical, rel)
  }
  // 页面自己的最后一段路径应与 canonical 尾段一致（防全站指首页）
  const expectTail = rel.replace(/\.html$/, '').replace(/\/index$/, '') || 'index'
  if (canonical) {
    const tail = canonical.replace(ORIGIN, '').replace(/^\//, '')
    const norm = tail === '' ? 'index' : tail
    if (norm !== expectTail) problems.push(`${rel}: canonical 尾段 ${norm} ≠ 文件 ${expectTail}`)
  }
}
if (problems.length === 0) ok(`${canonicals.size} 个页面 canonical 全绝对、唯一、且与页面路径一致`)
else problems.forEach(bad)

/* ---------- 7. 结构化数据覆盖 ---------- */
console.log('\n[7] 结构化数据')
const count = (t) =>
  htmlFiles.filter((f) => {
    const html = fs.readFileSync(f, 'utf8')
    return ldTypes(html).types.some((x) => x.includes(t))
  }).length
const rulePages = htmlFiles.filter((f) => /[\\/]rules[\\/][^\\/]+\.html$/.test(f)).length
for (const [type, min] of [
  ['WebSite', 1],
  ['Organization', 1],
  ['FAQPage', rulePages],
  ['ItemList', 2],
  ['BreadcrumbList', htmlFiles.length - 3],
]) {
  const n = count(type)
  if (n < min) bad(`${type} ${n} 个（应 ≥ ${min}）`)
  else ok(`${type} ${n} 个`)
}
ok(`规则词条页 ${rulePages} 个，每页都有 FAQPage`)

/* ---------- 8. 降级污染 ---------- */
console.log('\n[8] 构建污染')
for (const [label, needle] of [
  ['后端未连接', '后端未连接'],
  ['127.0.0.1:8080', '127.0.0.1:8080'],
]) {
  const hits = htmlFiles.filter((f) => fs.readFileSync(f, 'utf8').includes(needle))
  if (hits.length) bad(`${hits.length} 个 HTML 含「${label}」：${hits.slice(0, 3).map((f) => path.relative(DIR, f)).join(', ')}`)
  else ok(`无「${label}」`)
}

console.log('\n' + (fail === 0 ? `✓ 全部通过（HTML ${htmlFiles.length} 个）` : `✗ ${fail} 项失败`))
process.exit(fail === 0 ? 0 : 1)
