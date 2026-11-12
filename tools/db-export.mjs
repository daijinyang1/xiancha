#!/usr/bin/env node
/**
 * 先查 · 数据库 → 静态快照导出
 *
 * 数据唯一真源是 PostgreSQL（库 xiancha，表 rule / trap / cert）。
 * 线上是纯静态站，构建时无法连库，所以构建流水线第一步必须跑本脚本，
 * 把库里当前的内容导成 web/app/data/*.json，供 Nuxt 预渲染内联进 HTML。
 *
 * 用法：
 *   node tools/db-export.mjs            # 导出到 web/app/data/
 *   node tools/db-export.mjs --check    # 只比对库与快照是否一致，不一致时退出码 1
 *
 * 依赖本机 psql（不在 PATH，用 PSQL 常量）。口令走环境变量 PGPASSWORD。
 */
import { spawnSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const DATA = path.join(ROOT, 'web', 'app', 'data')

const PSQL = process.env.PSQL_BIN || 'D:/App/PostgreSQL/bin/psql.exe'
const DB = {
  host: process.env.DB_HOST || '127.0.0.1',
  port: process.env.DB_PORT || '5432',
  user: process.env.DB_USERNAME || 'xiancha',
  name: process.env.DB_NAME || 'xiancha',
  password: process.env.DB_PASSWORD || 'xiancha2026',
}

/** 一张表 → 一段 JSON 数组。列名用 AS 转成前端要的驼峰键。 */
const QUERIES = {
  rules: `select json_agg(row_to_json(r)) from (
    select id, ask, verdict, name, type, level,
           regex_source as "regexSource", regex_flags as "regexFlags",
           why, law, fix
    from rule order by id
  ) r;`,
  traps: `select json_agg(row_to_json(t)) from (
    select id, title, type, level, scene, signals, consequence, advice, source
    from trap order by id
  ) t;`,
  certs: `select json_agg(row_to_json(c)) from (
    select id, name, level, fit, signup, exam, fee, official, note,
           signup_url as "signupUrl", exam_date as "examDate"
    from cert order by id
  ) c;`,
}

function psql(sql) {
  const args = ['-h', DB.host, '-p', DB.port, '-U', DB.user, '-d', DB.name,
    '-t', '-A', '-v', 'ON_ERROR_STOP=1', '-c', sql]
  const r = spawnSync(PSQL, args, {
    encoding: 'utf8',
    env: { ...process.env, PGPASSWORD: DB.password },
    maxBuffer: 32 * 1024 * 1024,
  })
  if (r.error) throw new Error(`psql 启动失败：${r.error.message}（检查 PSQL_BIN）`)
  if (r.status !== 0) throw new Error(`psql 退出码 ${r.status}：${(r.stderr || '').trim()}`)
  const out = (r.stdout || '').trim()
  if (!out || out === 'null') return []
  return out
}

function main() {
  const checkOnly = process.argv.includes('--check')
  const isCi = Boolean(process.env.CI) || process.env.CF_PAGES === '1'

  if (!fs.existsSync(PSQL)) {
    // CI（Cloudflare Pages）里没有 Postgres，也没有 psql：这时用仓库里已提交的快照构建。
    // 本地开发/发布前由人跑一次 node tools/db-export.mjs，把库的最新内容提交上去，
    // 所以 CI 用的快照永远是「上次从库里导出的那一版」，不是手改的。
    const haveAll = Object.keys(QUERIES).every((n) =>
      fs.existsSync(path.join(DATA, n + '.json')),
    )
    if (isCi || haveAll) {
      console.log(`[db-export] 没有 psql（${PSQL}），使用仓库内已提交的库快照构建。`)
      console.log('[db-export] 本地改了数据请先跑 node tools/db-export.mjs 再提交。')
      process.exit(0)
    }
    console.error(`找不到 psql：${PSQL}`)
    console.error('且 web/app/data/ 下没有完整快照 —— 没有数据就无法构建。')
    process.exit(2)
  }

  fs.mkdirSync(DATA, { recursive: true })

  const stats = []
  let changed = 0

  for (const [name, sql] of Object.entries(QUERIES)) {
    const raw = psql(sql)
    let rows
    try {
      rows = JSON.parse(raw)
    } catch (e) {
      console.error(`[${name}] 返回的不是合法 JSON：${raw.slice(0, 120)}`)
      process.exit(3)
    }
    if (!Array.isArray(rows) || rows.length === 0) {
      console.error(`[${name}] 库里没有数据 —— 拒绝导出空快照覆盖线上（先跑 V2__seed.sql）`)
      process.exit(4)
    }
    // 稳定格式化：同样内容永远产出同样字节，避免无意义的 git diff
    const text = JSON.stringify(rows, null, 2) + '\n'
    const file = path.join(DATA, name + '.json')
    const before = fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : ''
    const same = before === text
    if (!same) changed++
    if (!checkOnly) fs.writeFileSync(file, text, 'utf8')
    stats.push({ table: name, rows: rows.length, bytes: Buffer.byteLength(text), same })
  }

  const pad = (s, n) => String(s).padEnd(n)
  console.log(pad('表', 8) + pad('行数', 6) + pad('字节', 9) + '与旧快照')
  for (const s of stats) {
    console.log(pad(s.table, 8) + pad(s.rows, 6) + pad(s.bytes, 9) + (s.same ? '一致' : '已更新'))
  }

  if (checkOnly) {
    console.log(changed === 0 ? '✓ 快照与数据库一致' : `✗ ${changed} 份快照落后于数据库（跑 node tools/db-export.mjs 重导）`)
    process.exit(changed === 0 ? 0 : 1)
  }
  console.log(`\n已导出 ${stats.length} 份快照 → web/app/data/`)
}

main()
