#!/usr/bin/env node
/**
 * 先查 · 全栈联调自检
 *
 * 验证「页面 → 后端 → PostgreSQL」这条链真的通，而不是各跑各的。
 * 前提：5432 在跑；本脚本会自己起 jar，测完精确 kill，不会留僵尸进程。
 *
 * 用法：node tools/verify-stack.mjs
 * 退出码 0 = 全通；非 0 = 有检查项失败（逐项打印原因）
 */
import { spawn, spawnSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const JAR = path.join(ROOT, 'server', 'target', 'xiancha-server-1.0.0.jar')
const PSQL = 'D:/App/PostgreSQL/bin/psql.exe'
const BASE = 'http://127.0.0.1:8080'
const PID_FILE = path.join(ROOT, '.verify-java.pid')

let pass = 0
let fail = 0

function ok(name, detail = '') {
  pass++
  console.log(`  ✓ ${name}${detail ? '  ' + detail : ''}`)
}
function bad(name, detail = '') {
  fail++
  console.log(`  ✗ ${name}${detail ? '  ' + detail : ''}`)
}
function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms))
}

/** 跑一条 SQL，返回单行单列 */
function sql(q) {
  const r = spawnSync(PSQL, ['-h', '127.0.0.1', '-U', 'xiancha', '-d', 'xiancha', '-t', '-A', '-c', q], {
    encoding: 'utf8',
    env: { ...process.env, PGPASSWORD: process.env.DB_PASSWORD || 'xiancha2026' },
  })
  if (r.status !== 0) throw new Error((r.stderr || '').trim())
  return (r.stdout || '').trim()
}

async function getJson(p) {
  const res = await fetch(BASE + p, { signal: AbortSignal.timeout(8000) })
  const text = await res.text()
  let json = null
  try {
    json = JSON.parse(text)
  } catch {}
  return { status: res.status, bytes: Buffer.byteLength(text), json }
}

async function waitForBackend(maxSec = 60) {
  const t0 = Date.now()
  while ((Date.now() - t0) / 1000 < maxSec) {
    try {
      const res = await fetch(BASE + '/api/stats', { signal: AbortSignal.timeout(2000) })
      if (res.ok) return (Date.now() - t0) / 1000
    } catch {}
    await sleep(1000) // ≤10 秒轮询间隔，符合宿主纪律
  }
  return -1
}

function killJava() {
  if (!fs.existsSync(PID_FILE)) return
  const pid = Number(fs.readFileSync(PID_FILE, 'utf8').trim())
  if (!Number.isFinite(pid) || pid <= 0) return
  try {
    spawnSync('taskkill', ['/PID', String(pid), '/F'], { stdio: 'ignore' })
    console.log(`  已停止后端 java (pid=${pid})`)
  } catch {}
  fs.rmSync(PID_FILE, { force: true })
}

async function main() {
  console.log('先查 · 全栈联调自检\n')

  // ── 0. 数据库 ──────────────────────────────────────────────
  console.log('[0] PostgreSQL')
  let ruleCount = 0
  try {
    ruleCount = Number(sql('select count(*) from rule'))
    const trapC = Number(sql('select count(*) from trap'))
    const certC = Number(sql('select count(*) from cert'))
    ok('数据库可连', `rule=${ruleCount} trap=${trapC} cert=${certC}`)
    if (ruleCount !== 63) bad('rule 应为 63 行', `实际 ${ruleCount}`)
    else ok('rule 行数', '63')
  } catch (e) {
    bad('数据库连不上', e.message.slice(0, 160))
    console.log('\n数据库不通，后续检查全部跳过。先启动 PostgreSQL。')
    process.exit(1)
  }

  // ── 1. 快照与库一致 ────────────────────────────────────────
  console.log('\n[1] 构建期快照')
  const chk = spawnSync(process.execPath, [path.join(ROOT, 'tools', 'db-export.mjs'), '--check'], {
    cwd: ROOT,
    encoding: 'utf8',
  })
  if (chk.status === 0) ok('web/app/data 与数据库一致')
  else bad('web/app/data 落后于数据库', '跑 node tools/db-export.mjs')

  // ── 2. 起后端 ──────────────────────────────────────────────
  console.log('\n[2] 后端')
  if (!fs.existsSync(JAR)) {
    bad('jar 不存在', 'cd server && mvn -DskipTests package')
    process.exit(1)
  }
  const logPath = path.join(ROOT, 'logs', 'verify-server.log')
  fs.mkdirSync(path.dirname(logPath), { recursive: true })
  const out = fs.openSync(logPath, 'w')
  const child = spawn('java', ['-jar', JAR], {
    cwd: ROOT, // application-local.yml 在项目根
    stdio: ['ignore', out, out],
    detached: false,
  })
  fs.writeFileSync(PID_FILE, String(child.pid))
  console.log(`  已启动 java pid=${child.pid}，等 /api/stats 就绪…`)

  const secs = await waitForBackend(60)
  if (secs < 0) {
    bad('后端 60 秒内没起来', `看 ${path.relative(ROOT, logPath)}`)
    killJava()
    process.exit(1)
  }
  ok('后端就绪', `${secs.toFixed(1)} 秒`)

  // ── 3. 老接口回归 ──────────────────────────────────────────
  console.log('\n[3] 原有接口')
  for (const p of ['/api/stats', '/api/rules', '/api/traps', '/api/certs']) {
    const r = await getJson(p)
    if (r.status === 200 && r.bytes > 100) ok(p, `${r.status}  ${r.bytes}B`)
    else bad(p, `status=${r.status} bytes=${r.bytes}`)
  }
  const rules = await getJson('/api/rules')
  const n = Array.isArray(rules.json) ? rules.json.length : rules.json?.data?.length ?? rules.json?.content?.length
  if (n === 63) ok('规则条数取自数据库', '63')
  else bad('规则条数不对', String(n))

  const filtered = await getJson('/api/rules?type=' + encodeURIComponent('押金类'))
  const fn = Array.isArray(filtered.json) ? filtered.json.length : -1
  if (fn > 0 && fn < 63) ok('按坑型筛选生效', `押金类 ${fn} 条`)
  else bad('按坑型筛选无效', `返回 ${fn}`)

  const q = await getJson('/api/rules?q=' + encodeURIComponent('押金'))
  const qn = Array.isArray(q.json) ? q.json.length : -1
  if (qn > 0) ok('关键词搜索生效', `"押金" ${qn} 条`)
  else bad('关键词搜索无效', `返回 ${qn}`)

  // ── 4. 新增接口 ────────────────────────────────────────────
  console.log('\n[4] 新增接口')
  const h = await getJson('/api/health')
  if (h.status === 200 && h.json?.db === true) ok('/api/health', `db=${h.json.db} rules=${h.json.rules}`)
  else bad('/api/health', `status=${h.status} body=${JSON.stringify(h.json).slice(0, 100)}`)

  const before = Number(sql('select count(*) from scan_log'))
  const scanText =
    '入职前需缴纳押金 800 元，离职时全额退还；实习期间自愿放弃社会保险。' +
    '公司有权根据经营情况单方调整岗位与薪资，员工需无条件服从。'
  const scanRes = await fetch(BASE + '/api/scan', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ text: scanText }),
    signal: AbortSignal.timeout(15000),
  })
  const scanJson = await scanRes.json().catch(() => null)
  if (scanRes.status === 200 && scanJson?.hits?.length > 0) {
    ok('POST /api/scan', `命中 ${scanJson.hits.length} 句 / ${scanJson.ruleCount} 条规则 / 分 ${scanJson.score}`)
  } else {
    bad('POST /api/scan', `status=${scanRes.status}`)
  }

  const after = Number(sql('select count(*) from scan_log'))
  if (after > before) ok('扫描结果落库（真连数据库）', `scan_log ${before} → ${after}`)
  else bad('扫描没有写库', `scan_log 仍是 ${after} 行`)

  const hist = await getJson('/api/scan/history?limit=5')
  const hn = Array.isArray(hist.json) ? hist.json.length : hist.json?.data?.length ?? -1
  if (hist.status === 200 && hn > 0) ok('/api/scan/history', `${hn} 条，最新 score=${hist.json[0]?.score ?? hist.json?.data?.[0]?.score}`)
  else bad('/api/scan/history', `status=${hist.status} 条数=${hn}`)

  const st = await getJson('/api/scan/stats')
  if (st.status === 200 && typeof st.json?.total === 'number' && Array.isArray(st.json?.last7Days)) {
    ok('/api/scan/stats', `total=${st.json.total} today=${st.json.today} avg=${st.json.avgScore} 7天=${st.json.last7Days.length} 段`)
  } else {
    bad('/api/scan/stats', `status=${st.status} body=${JSON.stringify(st.json).slice(0, 120)}`)
  }

  // ── 5. 前后端契约一致 ──────────────────────────────────────
  console.log('\n[5] 前后端字段对齐')
  const apiTs = fs.readFileSync(path.join(ROOT, 'web', 'app', 'composables', 'useApi.ts'), 'utf8')
  const want = ['fetchHealth', 'fetchScanHistory', 'fetchScanStats']
  for (const w of want) {
    if (apiTs.includes(w)) ok(`useApi.${w} 已定义`)
    else bad(`useApi.${w} 缺失`, '前端没接上新接口')
  }
  const sample = Array.isArray(hist.json) ? hist.json[0] : hist.json?.data?.[0]
  if (sample) {
    const keys = Object.keys(sample)
    const need = ['createdAt', 'sentenceHits', 'ruleHits', 'score', 'level']
    const miss = need.filter((k) => !keys.includes(k))
    if (miss.length === 0) ok('history 字段与前端类型一致', keys.join(','))
    else bad('history 缺字段', miss.join(','))
  }

  console.log(`\n结果：通过 ${pass} 项，失败 ${fail} 项`)
  killJava()
  process.exit(fail === 0 ? 0 : 1)
}

process.on('SIGINT', () => {
  killJava()
  process.exit(130)
})

main().catch((e) => {
  console.error('自检异常：', e)
  killJava()
  process.exit(1)
})
