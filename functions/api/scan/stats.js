// GET /api/scan/stats —— 扫描量汇总 + 近 7 天走势
//
// 对应 ScanHistoryController.stats + ScanHistoryService.stats。
// 返回 { total, today, avgScore, highCount, midCount, lowCount, last7Days[] }
// 分档阈值 40/15；last7Days 已补零满 7 天（前端不用自己补）。

import { json, methodNotAllowed, wrap } from '../../_lib/http.js'
import { scanStats } from '../../_lib/db.js'

export const onRequest = wrap(async ({ request, env }) => {
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    return methodNotAllowed('GET')
  }
  return json(await scanStats(env))
})
