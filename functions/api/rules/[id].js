// GET /api/rules/{id} —— 单条规则详情
//
// 对应 RuleService.detail：id 大小写不敏感，返回同坑型的 siblings（id 数组）
// 与 relatedRules（对象数组，均排除自己）。找不到返回 404。

import { json, notFound, methodNotAllowed, wrap } from '../../_lib/http.js'
import { getRule } from '../../_lib/catalog.js'

export const onRequest = wrap(async ({ request, params }) => {
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    return methodNotAllowed('GET')
  }
  const detail = getRule(params.id)
  if (!detail) return notFound(`规则不存在: ${params.id}`)
  return json(detail)
})
