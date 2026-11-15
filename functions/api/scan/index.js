// POST /api/scan —— 合同扫描，命中即落 scan_log。
//
// 对应 ScanController.scan + ScanService.scan。
// 响应 level 是 high|mid|low（阈值 40/15，与前端 scoreToLevel 一致）。
// 请求体 { text }，上限 50000 字符（对齐 ScanRequest @Size(max=50000)）。

import { badRequest, json, methodNotAllowed, readJson, wrap } from '../../_lib/http.js'
import { MAX_TEXT_LENGTH, scanText, sha256Hex } from '../../_lib/scan.js'
import { insertScanLog, nowIso } from '../../_lib/db.js'

export const onRequest = wrap(async ({ request, env }) => {
  if (request.method !== 'POST') {
    return methodNotAllowed('POST')
  }

  const body = await readJson(request)
  const text = body.text == null ? '' : String(body.text)

  if (text.length > MAX_TEXT_LENGTH) {
    return badRequest(`text: 长度不能超过 ${MAX_TEXT_LENGTH} 个字符（当前 ${text.length}）`)
  }

  const result = scanText(text)

  // 只落哈希与计数，绝不存原文；失败不影响返回（db.js 内部已 catch）
  await insertScanLog(env, {
    textHash: await sha256Hex(text),
    sentenceHits: result.sentenceCount,
    ruleHits: result.ruleCount,
    score: result.score,
    createdAt: nowIso(),
  })

  return json(result)
})
