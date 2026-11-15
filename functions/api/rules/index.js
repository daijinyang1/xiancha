// GET /api/rules?type=&level=&q= —— 规则列表
//
// 对应 RuleService.list。type / level 精确匹配，q 在八字段里模糊搜。

import { json, methodNotAllowed, queryParam, wrap } from '../../_lib/http.js'
import { listRules } from '../../_lib/catalog.js'

export const onRequest = wrap(async ({ request }) => {
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    return methodNotAllowed('GET')
  }
  const url = new URL(request.url)
  const items = listRules({
    type: queryParam(url, 'type'),
    level: queryParam(url, 'level'),
    q: queryParam(url, 'q'),
  })
  return json(items)
})
