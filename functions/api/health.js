// GET /api/health —— 健康探针
//
// 对应 HealthService.health。数据库探测失败时 status="degraded"、
// 三类计数归零，但**仍然返回 200**（前端据此只显示提示不判死）。
//
// uptimeSec 在 Workers 里没有进程概念，用本 isolate 的加载时刻近似：
// 冷启动后从 0 起算，多个 isolate 之间不连续。语义只用于「服务活着」判断。

import { json, methodNotAllowed, wrap } from '../_lib/http.js'
import { counts } from '../_lib/catalog.js'
import { ping } from '../_lib/db.js'

/** 本 isolate 的起算时刻。
 *
 * 为什么不在模块顶层取 Date.now()：Workers 运行时在模块求值期冻结时钟，
 * 顶层 Date.now() 拿到的是 0，直接减会得到一个十几亿秒的荒谬 uptime。
 * 改成首个请求进来时惰性起算 —— 语义是「本 isolate 处理首个请求至今」，
 * 仍然只用于判断服务是否活着，不承诺跨 isolate 连续。
 */
let STARTED_AT = 0

function uptimeSecNow() {
  const now = Date.now()
  if (STARTED_AT === 0) STARTED_AT = now
  return Math.max(0, Math.round((now - STARTED_AT) / 1000))
}

const VERSION = '1.0.0'

export const onRequest = wrap(async ({ request, env }) => {
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    return methodNotAllowed('GET')
  }

  const uptimeSec = uptimeSecNow()

  try {
    await ping(env)
    const c = counts()
    return json({
      status: 'ok',
      db: true,
      rules: c.rules,
      traps: c.traps,
      certs: c.certs,
      uptimeSec,
      version: VERSION,
    })
  } catch (err) {
    console.warn('health db probe failed:', err && err.message)
    return json({
      status: 'degraded',
      db: false,
      rules: 0,
      traps: 0,
      certs: 0,
      uptimeSec,
      version: VERSION,
    })
  }
})
