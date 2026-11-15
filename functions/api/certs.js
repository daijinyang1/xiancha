// GET /api/certs —— 考证清单
//
// 对应 CertService.list（findAllByOrderByIdAsc，生成时已按 id 排序）。

import { json, methodNotAllowed, wrap } from '../_lib/http.js'
import { listCerts } from '../_lib/catalog.js'

export const onRequest = wrap(async ({ request }) => {
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    return methodNotAllowed('GET')
  }
  return json(listCerts())
})
