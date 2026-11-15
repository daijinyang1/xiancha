#!/usr/bin/env node
// D1 运维小工具 —— 建库 / 迁移 / 查行数 / 本地起 Functions。
//
// 为什么要有这个文件：wrangler 的调用方式在本机有两个坑，写死在这一个地方，
// 别的脚本和文档都只引用它，避免各写一套。
//   1) 必须走 wrangler-dist/cli.js，不能走 bin/wrangler.js（后者 spawn 会 EPERM）
//   2) 参数一律 key=value 风格，不用 `--flag value`（PowerShell 会吞空字符串参数）
//
// 用法（在项目根执行）：
//   node tools/deploy-worker.mjs d1-create            建库（幂等：已存在就只打印 id）
//   node tools/deploy-worker.mjs d1-migrate           把 db/migrations/d1/*.sql 按名序应用到远端
//   node tools/deploy-worker.mjs d1-count             打印远端 scan_log 行数
//   node tools/deploy-worker.mjs d1-schema            打印远端表/索引清单
//   node tools/deploy-worker.mjs dev                  本地起 Pages Functions（默认 8788）
//   node tools/deploy-worker.mjs dev 8790             指定端口
//   node tools/deploy-worker.mjs check                校验生成物是否过期（生成器 --check）
//
// 全部命令都是显式操作，没有默认动作 —— 直接 `node tools/deploy-worker.mjs` 只打印帮助。

import { spawnSync } from 'node:child_process'
import { existsSync, readdirSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')

/** wrangler 4.158.0 的入口，与 tools/deploy.mjs 保持一致 */
const WRANGLER_CLI =
  process.env.WRANGLER_CLI || 'C:/Users/21971/.xiancha-deploy/node_modules/wrangler/wrangler-dist/cli.js'

/** 与 wrangler.toml 里 database_name 一致 */
const DB_NAME = 'xiancha-scan'

const MIGRATION_DIR = join(ROOT, 'db', 'migrations', 'd1')

const HELP = `D1 / Functions 运维

  node tools/deploy-worker.mjs d1-create     建库（已存在则只打印 id）
  node tools/deploy-worker.mjs d1-migrate    应用 db/migrations/d1/*.sql 到远端
  node tools/deploy-worker.mjs d1-count      远端 scan_log 行数
  node tools/deploy-worker.mjs d1-schema     远端表与索引清单
  node tools/deploy-worker.mjs dev [port]    本地起 Pages Functions（默认 8788）
  node tools/deploy-worker.mjs check         校验 functions/_lib/*.generated.js 是否过期
`

function run(cmd, args, opts = {}) {
  const r = spawnSync(cmd, args, { cwd: ROOT, stdio: 'inherit', ...opts })
  if (r.error) throw r.error
  return r.status ?? 1
}

function wrangler(args, opts = {}) {
  return run(process.execPath, [WRANGLER_CLI, ...args], opts)
}

/** 取 wrangler --json 的 output，静默执行（stdout 不直出，避免和 JSON 混行） */
function wranglerJson(args) {
  const r = spawnSync(process.execPath, [WRANGLER_CLI, ...args], {
    cwd: ROOT,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  })
  if (r.status !== 0) {
    throw new Error(`wrangler 退出码 ${r.status}\n${r.stderr || ''}${r.stdout || ''}`)
  }
  return JSON.parse(r.stdout)
}

/** 打印 d1 execute --json 的 results 数组 */
function execQuery(sql) {
  const out = wranglerJson(['d1', 'execute', DB_NAME, '--remote', '--command', sql, '--json'])
  return out[0]?.results ?? []
}

function d1Create() {
  // 先查一次库列表：已存在就不重复建（wrangler 对同名建库会报错退出码非 0）
  const list = wranglerJson(['d1', 'list', '--json'])
  const found = (Array.isArray(list) ? list : []).find(
    (d) => d.name === DB_NAME || d.database_name === DB_NAME,
  )
  if (found) {
    console.log(`已存在，跳过创建：${DB_NAME}`)
    console.log(`  database_id = ${found.uuid || found.database_id}`)
    return
  }
  const code = wrangler(['d1', 'create', DB_NAME])
  if (code !== 0) throw new Error('建库失败，看上面的 wrangler 输出')
}

function d1Migrate() {
  if (!existsSync(MIGRATION_DIR)) {
    throw new Error(`找不到迁移目录 ${MIGRATION_DIR}`)
  }
  const files = readdirSync(MIGRATION_DIR)
    .filter((f) => f.endsWith('.sql'))
    .sort()
  if (files.length === 0) {
    console.log('迁移目录里没有 .sql')
    return
  }
  for (const f of files) {
    console.log(`\n--- 应用 ${f} ---`)
    const code = wrangler([
      'd1',
      'execute',
      DB_NAME,
      '--remote',
      `--file=db/migrations/d1/${f}`,
    ])
    if (code !== 0) throw new Error(`迁移失败：${f}`)
  }
  console.log('\n全部迁移已应用。行数：')
  console.log(execQuery('select count(*) as n from scan_log'))
}

function d1Count() {
  console.log(execQuery('select count(*) as n from scan_log'))
}

function d1Schema() {
  console.log(execQuery('select type, name from sqlite_master order by type, name'))
}

function dev(port) {
  console.log(`本地起 Pages Functions：http://127.0.0.1:${port}/api/health`)
  console.log('（静态产物取 .out，D1 走本地模拟库；Ctrl+C 停）')
  // 注意：不要加 --d1=DB。wrangler.toml 里已声明 [[d1_databases]] binding="DB"，
  // 加了 --d1 反而会让 miniflare 按 binding 名另建一个空库，
  // 与 `d1 execute --local`（按 wrangler.toml 的 database_id 落盘）不是同一个文件，
  // 表现就是本机 /api/scan/* 报 no such table: scan_log。
  const code = wrangler([
    'pages',
    'dev',
    '.out',
    `--port=${port}`,
    '--compatibility-date=2026-11-01',
  ])
  process.exitCode = code
}

function check() {
  const code = run(process.execPath, [join(ROOT, 'tools', 'gen-functions-rules.mjs'), '--check'])
  process.exitCode = code
}

const [cmd, arg] = process.argv.slice(2)

const COMMANDS = {
  'd1-create': d1Create,
  'd1-migrate': d1Migrate,
  'd1-count': d1Count,
  'd1-schema': d1Schema,
  dev: () => dev(Number(arg) || 8788),
  check,
}

if (!cmd || cmd === 'help' || cmd === '--help') {
  console.log(HELP)
  process.exitCode = 0
} else if (!COMMANDS[cmd]) {
  console.error(`未知命令：${cmd}\n`)
  console.error(HELP)
  process.exitCode = 1
} else {
  try {
    COMMANDS[cmd]()
  } catch (e) {
    console.error(`\n失败：${e.message}`)
    process.exitCode = 1
  }
}
