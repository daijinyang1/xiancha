// D1 存储层：只负责 scan_log 这一张表。
//
// 规则 / 案例 / 证书是「随版本发布的只读数据」，编译在 rules.generated.js 里，
// 不走库 —— 省 D1 读额度（免费档每天 500 万读），也让 /rules 在库抖动时照常可用。
//
// 落库纪律（用户硬约束）：只存 text_hash + 计数 + 分数，**绝不存合同原文**。
//
// 时间口径：created_at 存 TEXT，格式 `YYYY-MM-DDTHH:MM:SS.sssZ`（UTC ISO8601）。
// 这样字符串比较即时间比较，`ORDER BY created_at DESC` 与范围过滤都不需要额外函数。
// 「今天」「近 7 天」按 **UTC+8** 切日（站点面向国内用户；PG 版 depends on session TimeZone）。

/** 统计分档阈值，与前端 scoreToLevel 一致 */
export const HIGH_SCORE = 40
export const MID_SCORE = 15

/** 站点时区偏移（分钟），用于切「今天」与「近 7 天」 */
export const SITE_TZ_OFFSET_MIN = 8 * 60

export const DEFAULT_LIMIT = 20
export const MAX_LIMIT = 200

/** 取 DB binding；没绑定时抛出可读错误，端点会把它变成 503 而不是 500 堆栈 */
export function getDb(env) {
  const db = env && env.DB
  if (!db) {
    const err = new Error('D1 binding DB 未配置（wrangler.toml 的 [[d1_databases]]）')
    err.status = 503
    throw err
  }
  return db
}

/** 探活：能拿回一个数字就说明绑定与库都通 */
export async function ping(env) {
  try {
    const row = await getDb(env).prepare('SELECT 1 AS ok').first()
    return row && row.ok === 1
  } catch {
    return false
  }
}

/** 现在时间，ISO8601 UTC 带毫秒与 Z */
export function nowIso() {
  return new Date().toISOString()
}

/**
 * 写一条扫描日志。失败不抛（与 Java saveLog 的 try/catch 一致）——
 * 扫描结果的返回不能被日志写入拖垮。
 * @returns {Promise<boolean>} 是否写入成功
 */
export async function insertScanLog(env, { textHash, sentenceHits, ruleHits, score, createdAt }) {
  try {
    await getDb(env)
      .prepare(
        'INSERT INTO scan_log (created_at, text_hash, sentence_hits, rule_hits, score) VALUES (?, ?, ?, ?, ?)'
      )
      .bind(createdAt || nowIso(), textHash || null, sentenceHits | 0, ruleHits | 0, score | 0)
      .run()
    return true
  } catch (e) {
    console.warn('扫描日志写入失败（不影响结果返回）：' + (e && e.message))
    return false
  }
}

/** 把 limit 规整到 [1, MAX_LIMIT]，<=0 或非数字用默认（对齐 Java） */
export function normalizeLimit(raw) {
  const n = Number.parseInt(raw, 10)
  if (!Number.isFinite(n) || n <= 0) return DEFAULT_LIMIT
  return Math.min(n, MAX_LIMIT)
}

/**
 * 最近扫描记录，created_at DESC, id DESC。
 * 返回 [{ id, createdAt, sentenceHits, ruleHits, score, level }]，level 用中文（前端 history.vue 只认 高/中/低）。
 */
export async function listHistory(env, limit) {
  const lim = normalizeLimit(limit)
  const { results } = await getDb(env)
    .prepare(
      'SELECT id, created_at, sentence_hits, rule_hits, score FROM scan_log ORDER BY created_at DESC, id DESC LIMIT ?'
    )
    .bind(lim)
    .all()

  return (results || []).map((r) => ({
    id: r.id,
    createdAt: toInstant(r.created_at),
    sentenceHits: r.sentence_hits | 0,
    ruleHits: r.rule_hits | 0,
    score: r.score | 0,
    level: levelOfScoreZh(r.score | 0),
  }))
}

/** 分数 → 中文档位（40/15），与 ScanHistoryService.levelOf 一致 */
export function levelOfScoreZh(score) {
  if (score >= HIGH_SCORE) return '高'
  if (score >= MID_SCORE) return '中'
  return '低'
}

/**
 * 把库里存的时间串统一成 `2026-11-12T12:31:02Z` 这种 ISO8601（Jackson 的 Instant 口径）。
 * 库里存的已经是 ISO，这里只做「有毫秒就省掉毫秒」的规整，保证与 Java 输出形状一致。
 */
export function toInstant(value) {
  if (value == null) return null
  const s = String(value)
  // 已是 ISO8601：削掉毫秒（.sss）保留 Z
  const iso = s.replace(/\.\d{3}Z$/, 'Z')
  return iso
}

/** 当前 UTC+8 的日期键 YYYY-MM-DD */
function siteDayKey(date = new Date()) {
  const shifted = new Date(date.getTime() + SITE_TZ_OFFSET_MIN * 60 * 1000)
  return shifted.toISOString().slice(0, 10)
}

/** 从今天往前 n 天的日期键（升序），最后一个是今天 */
export function lastNDayKeys(n = 7, today = new Date()) {
  const keys = []
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(today.getTime() - i * 24 * 60 * 60 * 1000)
    keys.push(siteDayKey(d))
  }
  return keys
}

/**
 * 扫描量汇总 + 近 7 天走势。
 * 返回 { total, today, avgScore, highCount, midCount, lowCount, last7Days: [{date,count,avgScore}] }
 *
 * 近 7 天按 UTC+8 切日；某天没有记录也补 0（PG 版靠 generate_series，这里在 JS 侧补，
 * 因为 SQLite 没有 generate_series 且补零逻辑放这里更直观）。
 */
export async function scanStats(env) {
  const db = getDb(env)

  const summary = await db
    .prepare(
      `SELECT
         COUNT(*)                                                        AS total,
         COALESCE(ROUND(AVG(score)), 0)                                  AS avg_score,
         COALESCE(SUM(CASE WHEN score >= ?1 THEN 1 ELSE 0 END), 0)        AS high_count,
         COALESCE(SUM(CASE WHEN score >= ?2 AND score < ?1 THEN 1 ELSE 0 END), 0) AS mid_count,
         COALESCE(SUM(CASE WHEN score < ?2 THEN 1 ELSE 0 END), 0)         AS low_count
       FROM scan_log`
    )
    .bind(HIGH_SCORE, MID_SCORE)
    .first()

  const days = lastNDayKeys(7)
  // 只查这 7 天窗口，用 UTC+8 的日界换算成 UTC 时间串做范围比较
  const fromKey = days[0]
  const fromUtc = new Date(Date.parse(fromKey + 'T00:00:00Z') - SITE_TZ_OFFSET_MIN * 60 * 1000).toISOString()

  const { results: dayRows } = await db
    .prepare(
      `SELECT substr(datetime(created_at, ?3), 1, 10) AS day,
              COUNT(*)                                 AS cnt,
              COALESCE(ROUND(AVG(score)), 0)           AS avg_score
         FROM scan_log
        WHERE created_at >= ?1
        GROUP BY day
        ORDER BY day`
    )
    .bind(fromUtc, '', `+${SITE_TZ_OFFSET_MIN} minutes`)
    .all()

  const byDay = new Map((dayRows || []).map((r) => [r.day, { count: r.cnt | 0, avgScore: r.avg_score | 0 }]))
  const last7Days = days.map((date) => {
    const hit = byDay.get(date)
    return { date, count: hit ? hit.count : 0, avgScore: hit ? hit.avgScore : 0 }
  })

  const todayKey = siteDayKey()
  const todayRow = byDay.get(todayKey)

  return {
    total: (summary && summary.total) | 0,
    today: todayRow ? todayRow.count : 0,
    avgScore: (summary && summary.avg_score) | 0,
    highCount: (summary && summary.high_count) | 0,
    midCount: (summary && summary.mid_count) | 0,
    lowCount: (summary && summary.low_count) | 0,
    last7Days,
  }
}
