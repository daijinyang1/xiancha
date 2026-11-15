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
