// GET /api/traps/{id} —— 单案例详情 + 规则链
//
// 对应 TrapService.detail：ruleChain 取同坑型的全部规则（含自己），
// relatedRuleIds 是同一批的 id 数组。

import { json, notFound, methodNotAllowed, wrap } from '../../_lib/http.js'
import { getTrap } from '../../_lib/catalog.js'

export const onRequest = wrap(async ({ request, params }) => {
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    return methodNotAllowed('GET')
  }
  const detail = getTrap(params.id)
  if (!detail) return notFound(`案例不存在: ${params.id}`)
  return json(detail)
})
