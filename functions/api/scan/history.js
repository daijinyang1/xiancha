// GET /api/scan/history?limit=20 —— 最近扫描记录（created_at DESC, id DESC）
//
// 对应 ScanHistoryController.history + ScanHistoryService.history。
// 返回的 level 是**中文** 高|中|低（前端 history.vue 只认这三个字）。
// 只含计数与分数，不含原文。

import { json, methodNotAllowed, queryParam, wrap } from '../../_lib/http.js'
import { listHistory } from '../../_lib/db.js'

export const onRequest = wrap(async ({ request, env }) => {
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    return methodNotAllowed('GET')
  }
  const limit = queryParam(new URL(request.url), 'limit')
  return json(await listHistory(env, limit))
})
