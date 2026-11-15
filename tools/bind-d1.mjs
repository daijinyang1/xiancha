#!/usr/bin/env node
// 给已存在的 Pages 项目补 D1 binding（Git 源项目改不了构建配置的替代路径）。
//
// 背景：Git 集成的 Pages 项目，wrangler.toml 里的 [[d1_databases]] 在**构建时**生效，
// 但线上 Functions 要拿到 env.DB，还需要项目自身的 deployment config 里带这条 binding
// （构建期有、运行期没有的话，函数里 env.DB 就是 undefined）。
// 直传项目能靠 wrangler.toml 直接推，Git 项目必须走 API 把 binding 写进配置。
//
// 关键格式（从 wrangler 源码 toEnvironment 反推，wrangler-dist/cli.js 第 305679 行）：
//   deployment_configs.production.d1_databases 是一个**以 binding 名为键的对象**：
//     { "DB": { "id": "<database_id>" } }
//   不是数组。写成数组 API 会静默丢掉。
//
// 这个脚本做的事（幂等，可反复跑）：
//   1. 读 wrangler.toml 里的 database_id（单一真源，不在这里写死）
//   2. 往 production / preview 的 d1_databases 对象里塞 { DB: { id } }
//   3. PATCH 回项目，并带上传入的 wrangler_config_hash
//   4. 重新 GET 一遍打印结果供核对
//
// 用法：
//   node tools/bind-d1.mjs            # 写入并打印结果
//   node tools/bind-d1.mjs --dry-run  # 只看会改成什么，不写

import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const DRY = process.argv.includes('--dry-run')

const TOML = path.join(os.homedir(), 'AppData', 'Roaming', 'xdg.config', '.wrangler', 'config', 'default.toml')

const PROJECT = 'xiancha'
const BINDING = 'DB'

/** 从 wrangler.toml 读 database_id / database_name，避免两处写死不同步 */
function readD1Config() {
  const txt = fs.readFileSync(path.join(ROOT, 'wrangler.toml'), 'utf8')
  const id = txt.match(/database_id\s*=\s*"([^"]+)"/)?.[1]
  const name = txt.match(/database_name\s*=\s*"([^"]+)"/)?.[1]
  if (!id) throw new Error('wrangler.toml 里找不到 database_id')
  if (!name) throw new Error('wrangler.toml 里找不到 database_name')
  return { id, name }
}

/** 从 wrangler 的 OAuth 配置里取 token（不落仓库） */
function readToken() {
  if (!fs.existsSync(TOML)) throw new Error(`找不到 ${TOML}，先跑一次 wrangler login`)
  const m = fs.readFileSync(TOML, 'utf8').match(/oauth_token\s*=\s*"([^"]+)"/)
  if (!m) throw new Error(`${TOML} 里没有 oauth_token，先跑一次 wrangler login`)
  return m[1]
}

async function cf(pathname, init = {}) {
  const res = await fetch(`https://api.cloudflare.com/client/v4${pathname}`, {
    ...init,
    headers: {
      authorization: 'Bearer ' + readToken(),
      'content-type': 'application/json',
      'user-agent': 'dsh',
      ...(init.headers || {}),
    },
  })
  const body = await res.json()
  if (!body.success) throw new Error(`Cloudflare API ${res.status}: ${JSON.stringify(body.errors)}`)
  return body.result
}

async function main() {
  const d1 = readD1Config()

  // account id 从 projects 列表反查（不写死，换账号也不崩）
  const acctId = process.env.CF_ACCOUNT_ID
  if (!acctId) throw new Error('设 CF_ACCOUNT_ID 环境变量（wrangler whoami 里能看到）')

  const project = await cf(`/accounts/${acctId}/pages/projects/${PROJECT}`)
  console.log(`项目：${project.name}   子域：${project.subdomain}`)
  console.log(`目标：d1_databases.${BINDING} = { id: "${d1.id}" }  (${d1.name})`)

  const current = project.deployment_configs || {}
  const payload = {}

  for (const envName of ['production', 'preview']) {
    const cfg = current[envName] || {}
    const prev = cfg.d1_databases || {}
    const next = { ...prev, [BINDING]: { id: d1.id } }
    console.log(`\n${envName}.d1_databases`)
    console.log('  之前:', JSON.stringify(prev))
    console.log('  之后:', JSON.stringify(next))
    payload[envName] = {
      d1_databases: next,
      // PATCH 必须原样带回来，否则 Cloudflare 会把它当成配置变更而拒绝
      wrangler_config_hash: cfg.wrangler_config_hash,
    }
  }

  if (DRY) {
    console.log('\n--dry-run：未提交')
    return
  }

  await cf(`/accounts/${acctId}/pages/projects/${PROJECT}`, {
    method: 'PATCH',
    body: JSON.stringify({ deployment_configs: payload }),
  })

  const check = await cf(`/accounts/${acctId}/pages/projects/${PROJECT}`)
  const got = (envName) => JSON.stringify(check.deployment_configs?.[envName]?.d1_databases ?? null)
  console.log('\n已提交，服务端现在读到：')
  console.log('  production:', got('production'))
  console.log('  preview   :', got('preview'))

  const ok = ['production', 'preview'].every(
    (e) => check.deployment_configs?.[e]?.d1_databases?.[BINDING]?.id === d1.id,
  )
  if (!ok) throw new Error('回读不一致，binding 没写进去')
  console.log('\n✅ binding 已就位')
}

main().catch((e) => {
  console.error('FAILED:', e.message)
  process.exit(1)
})
