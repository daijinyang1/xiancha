// GET /api/traps?type= —— 案例列表
//
// 对应 TrapService.list：type 为空返回全部，否则按坑型过滤。

import { json, methodNotAllowed, queryParam, wrap } from '../../_lib/http.js'
import { listTraps } from '../../_lib/catalog.js'

export const onRequest = wrap(async ({ request }) => {
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    return methodNotAllowed('GET')
  }
  const url = new URL(request.url)
  return json(listTraps({ type: queryParam(url, 'type') }))
})
