// 合同扫描引擎 —— server/src/main/java/com/xiancha/service/ScanService.java 的 1:1 移植。
//
// 移植纪律（改这里前先读 Java 真源）：
//  · 分句符 `。！？\n\r`，句末标点归属本句
//  · 同一句命中多条规则合并成一个 hit（同 id 只留第一条）
//  · 每句取等级最高那条作为句子等级，权重 高3/中2/低1，×10 累加，封顶 100
//  · 单条规则最多记 500 次命中；空匹配跳过
//  · 空白判定用 Java Character.isWhitespace 的等价实现（JS \s 会把 \u00A0 也算空白，Java 不算）
//
// 与 Java 版唯一的**有意**差异：score → level 的阈值。
// Java ScanService.levelOfScore 用 70/40 且输出 "medium"，但前端 scanLevelLabel 只认
// high|mid|low，medium 会被显示成「低风险」。统一口径按前端 scoreToLevel 与
// ScanHistoryService 的 40/15，输出 high|mid|low。

import { RULES } from './rules.generated.js'

/** 分句符：。！？ 与换行（含 \r） */
export const SENTENCE_DELIMS = '。！？\n\r'

/** 单条规则在一段文本里最多记多少次命中 */
export const MAX_MATCHES_PER_RULE = 500

/** 扫描正文上限（字符），对齐 ScanRequest 的 @Size(max=50000) */
export const MAX_TEXT_LENGTH = 50000

/** 等级权重：高 3 / 中 2 / 低 1 —— 与 Java levelWeight 一致 */
export function levelWeight(level) {
  if (level === '高') return 3
  if (level === '中') return 2
  return 1
}

/**
 * 分数 → 风险档位，阈值 40/15（与前端 scoreToLevel、ScanHistoryService 一致）。
 * 输出 high | mid | low。
 */
export function levelOfScore(score) {
  if (score >= 40) return 'high'
  if (score >= 15) return 'mid'
  return 'low'
}

/** 分数 → 中文档位，阈值 40/15（与 ScanHistoryService.levelOf 一致）。输出 高 | 中 | 低。 */
export function levelOfScoreZh(score) {
  if (score >= 40) return '高'
  if (score >= 15) return '中'
  return '低'
}

/**
 * Java Character.isWhitespace 的等价判定。
 * Java：空格类(Zs/Zl/Zp) 但不含 \u00A0 \u2007 \u202F，外加 \t \n \u000B \f \r 与 \u001C-\u001F。
 * 注意 JS 的 \s 会把 \u00A0 与 \uFEFF 也算空白，所以不能直接用。
 */
const SPACE_SEP = /[\p{Zs}\p{Zl}\p{Zp}]/u
export function isJavaWhitespace(ch) {
  const c = ch.charCodeAt(0)
  if (c === 0x20) return true
  if (c >= 0x09 && c <= 0x0d) return true
  if (c >= 0x1c && c <= 0x1f) return true
  if (c === 0x00a0 || c === 0x2007 || c === 0x202f) return false
  return SPACE_SEP.test(ch)
}

/** 分句符快速判定（避免 indexOf 每次建串） */
function isDelim(ch) {
  const c = ch.charCodeAt(0)
  // 。\u3002 ！\uFF01 ？\uFF1F \n \r
  return c === 0x3002 || c === 0xff01 || c === 0xff1f || c === 0x0a || c === 0x0d
}

/**
 * 找到 index 所在句子的区间 [start, end)：
 * 向前后扩到分句符为止，句末标点算进句内，再收紧掉首尾空白。
 * 与 Java sentenceSpan 逐行对应。
 */
export function sentenceSpan(text, index) {
  const n = text.length
  const i = Math.min(Math.max(index, 0), n)
  let start = i
  while (start > 0 && !isDelim(text[start - 1])) start--
  let end = i
  while (end < n && !isDelim(text[end])) end++
  if (end < n) end++ // 句末标点归属本句
  while (start < end && isJavaWhitespace(text[start])) start++
  while (end > start && isJavaWhitespace(text[end - 1])) end--
  return [start, end]
}

/* ─────────────────────────── 否定语境守护 ───────────────────────────
 * 为什么需要：合同里大量出现「我们不做坏事」的声明，例如
 *   「公司不收取任何押金。」「不扣押员工身份证原件。」「入职无需缴纳押金。」
 * 规则写的是「收取押金」「扣押…身份证」，遇到前面的「不」照样匹配，
 * 用户一扫就看到一片红 —— 这是系统性的误报，不是某条规则写错。
 *
 * 三条约束（都是实测出来的，改之前先看 tools/rule-cases.mjs 与 docs 里的数字）：
 *  1. 作用域按**从句**切（，、；也断），不能按句号。否则
 *     「公司不收取押金，但要交 800 元服装费」里的 R01 会被连带压掉。
 *  2. 必须排除**假否定词**：不过 / 不仅 / 不但 / 不管 / 不论 / 不得不 / 不外乎 / 差不多。
 *     否则「我们不收押金，**不过**要扣押身份证原件」里的 R03 会被误杀。
 *  3. 规则本身在描述「义务缺失」的不加守护（正则里出现 不/未/没/无 的 38 条，如
 *     R13「试岗不发工资」、R25「实习期间不缴社保」）。不加这条，
 *     「不签劳动合同」「公司不交社保」「干不满一年不发年终奖」会全部漏掉。
 */
const CLAUSE_BOUND = '。！？\n\r，,、；;'

/** 假否定词：里面的「不」不表否定，判定前先挖掉 */
const FALSE_NEGATIVE = /(?:不过|不仅|不但|不光|不管|不论|不得不|不外乎|差不多|了不起|时不时)/g

/** 真否定词。长的在前无所谓 —— 只做 test，不取位置 */
const REAL_NEGATIVE = /(?:无需|无须|不得|禁止|严禁|绝不|不会|不存在|不予|暂不|并未|决不|免于|免除|不|没|未|免|无)/

/** 规则是否在描述「义务缺失」（正则里自带否定字）—— 这类规则不加守护 */
function isAbsenceRule(rule) {
  const src = rule && rule.regexSource
  return typeof src === 'string' && /[不未没无]/.test(src)
}

/** 取 index 所在从句的 [start, index) 文本 */
function clauseBefore(text, index) {
  let start = 0
  for (let i = index - 1; i >= 0; i--) {
    if (CLAUSE_BOUND.includes(text[i])) {
      start = i + 1
      break
    }
  }
  return text.slice(start, index)
}

/**
 * 命中点是否处在否定语境里（即「这里说的是一件没有被做的事」）。
 * 命中点之前同一从句里出现真否定词 → 判为否定。
 */
export function inNegatedClause(text, index) {
  const clause = clauseBefore(text, index).replace(FALSE_NEGATIVE, (m) => '口'.repeat(m.length))
  return REAL_NEGATIVE.test(clause)
}

/** Java flagsOf：i→CASE_INSENSITIVE|UNICODE_CASE，m→MULTILINE，s→DOTALL，u→UNICODE_CASE，其余忽略 */
function jsFlagsOf(javaFlags) {
  let f = 'g' // 全局扫描用
  if (!javaFlags) return f
  for (const c of javaFlags) {
    if (c === 'i') f += 'i'
    else if (c === 'm') f += 'm'
    else if (c === 's') f += 's'
    else if (c === 'u') f += 'u'
    // 其余标志忽略（与 Java default 分支一致）
  }
  // 去重（比如 "ii"）
  return [...new Set(f)].join('')
}

/**
 * 编译全部规则。模块级缓存：同一个 isolate 内只编译一次，规则是随版本发布的常量。
 * 编译失败的规则跳过并记一条 warn（与 Java compiledRules 一致），绝不让单条坏正则打挂整站。
 */
let compiledCache = null

export function compiledRules() {
  if (compiledCache) return compiledCache
  const out = []
  for (const rule of RULES) {
    const src = rule.regexSource
    if (!src || !src.trim()) continue
    try {
      out.push({ rule, pattern: new RegExp(src, jsFlagsOf(rule.regexFlags)) })
    } catch (e) {
      console.warn(`规则 ${rule.id} 的正则无法编译，已跳过：${e.message}`)
    }
  }
  compiledCache = out
  return compiledCache
}

/** 供自检用：强制重新编译 */
export function reloadRules() {
  compiledCache = null
}

/**
 * 扫描一段文本。返回 { score, level, sentenceCount, ruleCount, hits, elapsedMs }。
 *
 * hits[].sentence 是原文片段（**只在响应里回传，绝不落库**），
 * start/end 是 UTF-16 索引，与 Java String 索引口径一致。
 */
export function scanText(input) {
  const t0 = Date.now()
  const src = input == null ? '' : String(input)

  /** key = `${start}:${end}` → { start, end, rules: Map<id, rule> } */
  const bySentence = new Map()
  const hitRuleIds = new Set()

  for (const { rule, pattern } of compiledRules()) {
    pattern.lastIndex = 0
    let guard = 0
    let m
    // Java: while (guard++ < MAX && m.find())
    while (guard < MAX_MATCHES_PER_RULE && (m = pattern.exec(src)) !== null) {
      guard++
      const mStart = m.index
      const mEnd = m.index + m[0].length
      // 空匹配：跳过，但要推进 lastIndex 否则死循环（Java matcher.find 自己会推进）
      if (mEnd <= mStart) {
        pattern.lastIndex = mEnd + 1
        continue
      }
      // 否定语境守护：描述「禁止行为」的规则，命中点处在否定从句里就不算命中
      if (!isAbsenceRule(rule) && inNegatedClause(src, mStart)) continue
      const [spanStart, spanEnd] = sentenceSpan(src, mStart)
      if (spanEnd <= spanStart) continue
      const key = spanStart + ':' + spanEnd
      let b = bySentence.get(key)
      if (!b) {
        b = { start: spanStart, end: spanEnd, rules: new Map() }
        bySentence.set(key, b)
      }
      if (!b.rules.has(rule.id)) b.rules.set(rule.id, rule) // 同句同规则只留第一条
    }
  }

  const hits = []
  let score = 0
  for (const b of bySentence.values()) {
    // 句子内规则排序：等级高的在前，同级按 id 升序
    const sorted = [...b.rules.values()].sort((x, y) => {
      const d = levelWeight(y.level) - levelWeight(x.level)
      if (d !== 0) return d
      return x.id < y.id ? -1 : x.id > y.id ? 1 : 0
    })
    const sentenceLevel = sorted[0].level
    score += levelWeight(sentenceLevel) * 10
    for (const r of sorted) hitRuleIds.add(r.id)
    hits.push({
      sentence: src.slice(b.start, b.end),
      start: b.start,
      end: b.end,
      level: sentenceLevel,
      rules: sorted.map((r) => ({ id: r.id, ask: r.ask, name: r.name, level: r.level })),
    })
  }

  // 命中句子排序：等级高的在前，同级按出现位置升序
  hits.sort((a, b) => {
    const d = levelWeight(b.level) - levelWeight(a.level)
    if (d !== 0) return d
    return a.start - b.start
  })

  const finalScore = Math.min(100, score)
  return {
    score: finalScore,
    level: levelOfScore(finalScore),
    sentenceCount: hits.length,
    ruleCount: hitRuleIds.size,
    hits,
    elapsedMs: Math.max(0, Date.now() - t0),
  }
}

/** SHA-256 小写 hex（对齐 Java sha256：UTF-8 字节 → HexFormat.formatHex） */
export async function sha256Hex(text) {
  const bytes = new TextEncoder().encode(String(text ?? ''))
  const digest = await crypto.subtle.digest('SHA-256', bytes)
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('')
}
