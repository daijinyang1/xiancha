// GET /api/stats —— 数据总览
//
// 对应 StatsService.stats。三张分布表都用全量键打底 0，键集合稳定。

import { json, methodNotAllowed, wrap } from '../_lib/http.js'
import { computeStats } from '../_lib/catalog.js'

export const onRequest = wrap(async ({ request }) => {
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    return methodNotAllowed('GET')
  }
  return json(computeStats())
})
