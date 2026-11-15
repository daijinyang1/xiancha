#!/usr/bin/env node
/**
 * 先查 · 静态快照 → Pages Functions 数据模块
 *
 * 线上后端（Cloudflare Pages Functions）跑在边缘，连不到 PostgreSQL，
 * 规则/案例/证书这类「只读、随版本发布」的数据必须编译进函数包。
 * 本脚本把 web/app/data/*.json（构建第 0 步由 tools/db-export.mjs 从库里导出）
 * 原样转成 ESM 模块，避免手抄导致线上与库不一致。
 *
 * 用法：
 *   node tools/gen-functions-rules.mjs           # 生成
 *   node tools/gen-functions-rules.mjs --check   # 只比对，不一致退出码 1（CI 用）
 *
 * 生成物：functions/_lib/{rules,traps,certs}.generated.js
 * 这三个文件是生成物，不要手改；改数据请改库再 db-export。
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const DATA = path.join(ROOT, 'web', 'app', 'data')
const OUT = path.join(ROOT, 'functions', '_lib')

/** 每份快照的生成配置：源文件名 → 导出常量名 + 说明 */
const TARGETS = [
  { file: 'rules.json', name: 'RULES', varName: 'RULES', desc: '合同风险规则', key: 'id' },
  { file: 'traps.json', name: 'TRAPS', varName: 'TRAPS', desc: '避坑案例', key: 'id' },
  { file: 'certs.json', name: 'CERTS', varName: 'CERTS', desc: '考证日历', key: 'id' },
]

const CHECK = process.argv.includes('--check')

function buildTarget(t) {
  const src = path.join(DATA, t.file)
  if (!fs.existsSync(src)) {
    throw new Error(`缺少快照 ${src}，先跑 node tools/db-export.mjs`)
  }
  const rows = JSON.parse(fs.readFileSync(src, 'utf8'))
  if (!Array.isArray(rows) || rows.length === 0) {
    throw new Error(`${t.file} 不是非空数组`)
  }
  // 主键唯一性在这里兜住，否则 /rules/{id} 会出现不确定结果
  const seen = new Set()
  for (const r of rows) {
    if (!r[t.key]) throw new Error(`${t.file} 存在缺少 ${t.key} 的记录：${JSON.stringify(r).slice(0, 120)}`)
    if (seen.has(r[t.key])) throw new Error(`${t.file} 主键重复：${r[t.key]}`)
    seen.add(r[t.key])
  }

  const body = JSON.stringify(rows, null, 2)
  return (
    `// 生成物，请勿手改 —— 由 tools/gen-functions-rules.mjs 从 web/app/data/${t.file} 生成\n` +
    `// 源数据真源：PostgreSQL 库 xiancha 的 ${t.file.replace('.json', '')} 表\n` +
    `// 共 ${rows.length} 条 ${t.desc}\n` +
    `export const ${t.varName} = ${body}\n`
  )
}

fs.mkdirSync(OUT, { recursive: true })

let dirty = 0
const lines = []
for (const t of TARGETS) {
  const content = buildTarget(t)
  const dest = path.join(OUT, `${t.name.toLowerCase()}.generated.js`)
  const prev = fs.existsSync(dest) ? fs.readFileSync(dest, 'utf8') : null

  if (CHECK) {
    if (prev === content) {
      lines.push(`  ok    ${path.relative(ROOT, dest)}`)
    } else {
      dirty++
      lines.push(`  DIFF  ${path.relative(ROOT, dest)}  ${prev === null ? '（文件不存在）' : '（内容不一致）'}`)
    }
    continue
  }

  if (prev === content) {
    lines.push(`  same  ${path.relative(ROOT, dest)}`)
  } else {
    fs.writeFileSync(dest, content, 'utf8')
    lines.push(`  write ${path.relative(ROOT, dest)}  ${content.length} 字节`)
  }
}

console.log(`gen-functions-rules: ${CHECK ? '校验' : '生成'} ${TARGETS.length} 份`)
for (const l of lines) console.log(l)

if (CHECK && dirty > 0) {
  console.error(`\n有 ${dirty} 份生成物与快照不一致，先跑 node tools/gen-functions-rules.mjs`)
  process.exit(1)
}
