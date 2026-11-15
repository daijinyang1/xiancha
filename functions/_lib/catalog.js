// 只读数据目录：规则 / 案例 / 证书 / 汇总统计的查询逻辑。
//
// 对应 Java 的 RuleService / TrapService / CertService / StatsService。
// 数据来自 rules.generated.js 等编译期常量（由 tools/gen-functions-rules.mjs 生成），
// 查询在内存里做 —— 63 / 12 / 6 条的量级，比走 D1 更快也更省额度。

import { RULES } from './rules.generated.js'
import { TRAPS } from './traps.generated.js'
import { CERTS } from './certs.generated.js'

/** 8 类坑型，顺序即前端徽章顺序（对齐 Constants.RULE_TYPES） */
export const RULE_TYPES = ['押金类', '培训贷', '无薪试岗', '违约金', '社保', '加班', '合同文本', '离职']

/** 3 个风险等级（对齐 Constants.LEVELS） */
export const LEVELS = ['高', '中', '低']

/** Spring 的 trimToNull：trim 后空串视为没传 */
function trimToNull(v) {
  if (v == null) return null
  const t = String(v).trim()
  return t === '' ? null : t
}

/** 大小写不敏感的子串判定（对齐 RuleService.contains，null 视为不命中） */
function contains(haystack, kwLower) {
  if (haystack == null) return false
  return String(haystack).toLowerCase().includes(kwLower)
}

/** 规则列表：type / level 精确匹配，q 模糊搜 id/ask/name/why/law/fix/verdict/type */
export function listRules({ type, level, q } = {}) {
  const t = trimToNull(type)
  const l = trimToNull(level)
  const kw = trimToNull(q)
  const kwLower = kw == null ? null : kw.toLowerCase()

  return RULES.filter((r) => {
    if (t !== null && r.type !== t) return false
    if (l !== null && r.level !== l) return false
    if (kwLower !== null) {
      const hit =
        contains(r.id, kwLower) ||
        contains(r.ask, kwLower) ||
        contains(r.name, kwLower) ||
        contains(r.why, kwLower) ||
        contains(r.law, kwLower) ||
        contains(r.fix, kwLower) ||
        contains(r.verdict, kwLower) ||
        contains(r.type, kwLower)
      if (!hit) return false
    }
    return true
  })
}

/** 精简关联规则，对齐 RuleDetail.RelatedRule */
function toRelated(r) {
  return { id: r.id, ask: r.ask, name: r.name, level: r.level, type: r.type }
}

/** 单词条 + 同坑型其他规则（siblings 是 id 数组，relatedRules 是对象数组） */
export function getRule(id) {
  const key = id == null ? '' : String(id).trim().toUpperCase()
  const rule = RULES.find((r) => r.id === key)
  if (!rule) return null
  const sameType = RULES.filter((r) => r.type === rule.type)
  const siblings = sameType.filter((r) => r.id !== rule.id).map((r) => r.id)
  return {
    id: rule.id,
    ask: rule.ask,
    verdict: rule.verdict,
    name: rule.name,
    type: rule.type,
    level: rule.level,
    regexSource: rule.regexSource,
    regexFlags: rule.regexFlags,
    why: rule.why,
    law: rule.law,
    fix: rule.fix,
    siblings,
    relatedRules: sameType.filter((r) => r.id !== rule.id).map(toRelated),
  }
}

/** 案例列表，可按坑型过滤 */
export function listTraps({ type } = {}) {
  const t = trimToNull(type)
  if (t === null) return TRAPS.slice()
  return TRAPS.filter((x) => x.type === t)
}

/** 单案例 + 同坑型规则链 */
export function getTrap(id) {
  const key = id == null ? '' : String(id).trim().toUpperCase()
  const trap = TRAPS.find((x) => x.id === key)
  if (!trap) return null
  const chain = RULES.filter((r) => r.type === trap.type).map(toRelated)
  return {
    id: trap.id,
    title: trap.title,
    type: trap.type,
    level: trap.level,
    scene: trap.scene,
    signals: trap.signals || [],
    consequence: trap.consequence,
    advice: trap.advice,
    source: trap.source,
    relatedRuleIds: chain.map((r) => r.id),
    ruleChain: chain,
  }
}

/** 考证列表 */
export function listCerts() {
  return CERTS.slice()
}

/**
 * 汇总统计。byType / byLevel / trapsByType 都先用全量键打底 0，
 * 再累加真实计数 —— 前端拿到的键集合永远稳定（对齐 StatsService 的 LinkedHashMap 预填）。
 */
export function computeStats() {
  const byType = {}
  for (const t of RULE_TYPES) byType[t] = 0
  const byLevel = {}
  for (const l of LEVELS) byLevel[l] = 0
  const trapsByType = {}
  for (const t of RULE_TYPES) trapsByType[t] = 0

  for (const r of RULES) {
    if (r.type != null) byType[r.type] = (byType[r.type] || 0) + 1
    if (r.level != null) byLevel[r.level] = (byLevel[r.level] || 0) + 1
  }
  for (const t of TRAPS) {
    if (t.type != null) trapsByType[t.type] = (trapsByType[t.type] || 0) + 1
  }

  return {
    rules: RULES.length,
    traps: TRAPS.length,
    certs: CERTS.length,
    byType,
    byLevel,
    trapsByType,
  }
}

/** 三类只读数据的计数，health 用 */
export function counts() {
  return { rules: RULES.length, traps: TRAPS.length, certs: CERTS.length }
}
