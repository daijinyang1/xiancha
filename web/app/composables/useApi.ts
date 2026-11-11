// 先查 · 统一的后端访问层
// 契约见 项目根/API契约.md。数据一律走后端：页面只通过 fetchRules / fetchRule /
// fetchTraps / fetchCerts / fetchStats / scan 这几个方法取数，不直接读 seed。
// 每个方法内部的 catch 是唯一的降级出口——后端（Spring Boot :8080）没起来时
// 才回落到 app/data/*.json 快照，页面不白屏、不报错，并置顶提示当前是兜底数据。
import rulesSeed from '~/data/rules.json'
import trapsSeed from '~/data/traps.json'
import certsSeed from '~/data/certs.json'

export const RULE_TYPES = ['押金类', '培训贷', '无薪试岗', '违约金', '社保', '加班', '合同文本', '离职'] as const
export const LEVELS = ['高', '中', '低'] as const

export interface Rule {
  id: string
  ask: string
  verdict: string
  name: string
  type: string
  level: string
  why: string
  law: string
  fix: string
  regexSource?: string
}

export interface Trap {
  id: string
  title: string
  type: string
  level: string
  scene: string
  signals: string[]
  consequence: string
  advice: string
  source: string
}

export interface Cert {
  id: string
  name: string
  level: string
  fit: string
  signup: string
  exam: string
  fee: string
  official: string
  note: string
  signupUrl: string
  examDate: string
}

export interface ScanHit {
  sentence: string
  start: number
  end: number
  level: string
  rules: { id: string; ask: string; name: string; level: string }[]
}

export interface ScanResult {
  score: number
  level: string
  sentenceCount: number
  ruleCount: number
  hits: ScanHit[]
  elapsedMs: number
}

export interface Stats {
  rules: number
  traps: number
  certs: number
  byType: Record<string, number>
  byLevel: Record<string, number>
}

const RULES = rulesSeed as unknown as Rule[]
const TRAPS = trapsSeed as unknown as Trap[]
const CERTS = certsSeed as unknown as Cert[]

/** 后端不可用时用于置顶提示（页面里可见，不静默） */
export function useApiStatus() {
  return useState<{ degraded: boolean; reason: string }>('api-status', () => ({ degraded: false, reason: '' }))
}

/** 纯静态模式：没配 apiBase，就用随包数据，不算「后端掉线」 */
class OfflineError extends Error {}

async function getJson<T>(base: string, path: string, timeoutMs = 2500): Promise<T> {
  if (!base) throw new OfflineError('static')
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), timeoutMs)
  try {
    const res = await fetch(base + path, {
      signal: ctrl.signal,
      headers: { Accept: 'application/json' },
    })
    if (!res.ok) throw new Error('HTTP ' + res.status)
    return (await res.json()) as T
  } finally {
    clearTimeout(timer)
  }
}

/** 数组归一：后端可能返回裸数组，也可能返回 { data: [...] } 或分页对象 */
function asList<T>(raw: unknown): T[] {
  if (Array.isArray(raw)) return raw as T[]
  if (raw && typeof raw === 'object') {
    const obj = raw as Record<string, unknown>
    for (const key of ['data', 'list', 'content', 'items', 'records']) {
      if (Array.isArray(obj[key])) return obj[key] as T[]
    }
  }
  return []
}

const norm = (s: unknown) => String(s ?? '').trim().toLowerCase()

function filterRules(rules: Rule[], q: { type?: string; level?: string; q?: string }) {
  const kw = norm(q.q)
  return rules.filter((r) => {
    if (q.type && r.type !== q.type) return false
    if (q.level && r.level !== q.level) return false
    if (!kw) return true
    return [r.id, r.ask, r.verdict, r.name, r.type, r.why, r.law, r.fix]
      .map(norm)
      .join(' ')
      .includes(kw)
  })
}

/** 本地兜底扫描：与后端同一口径（按句子切分，一句可命中多条规则） */
function localScan(text: string): ScanResult {
  const t0 = Date.now()
  const sentences = text
    .split(/[。！？；\n]+/)
    .map((s) => s.trim())
    .filter((s) => s.length >= 4)

  const hits: ScanHit[] = []
  let offset = 0
  for (const sentence of sentences) {
    const start = text.indexOf(sentence, offset)
    offset = start >= 0 ? start + sentence.length : offset
    const matched: Rule[] = []
    for (const rule of RULES) {
      if (!rule.regexSource) continue
      let re: RegExp
      try {
        re = new RegExp(rule.regexSource, 'g')
      } catch {
        continue
      }
      if (re.test(sentence)) matched.push(rule)
    }
    if (!matched.length) continue
    const worst = matched.some((r) => r.level === '高')
      ? '高'
      : matched.some((r) => r.level === '中')
        ? '中'
        : '低'
    hits.push({
      sentence,
      start: start >= 0 ? start : 0,
      end: start >= 0 ? start + sentence.length : sentence.length,
      level: worst,
      rules: matched.map((r) => ({ id: r.id, ask: r.ask, name: r.name, level: r.level })),
    })
  }

  const ruleCount = hits.reduce((n, h) => n + h.rules.length, 0)
  const score = Math.min(100, hits.filter((h) => h.level === '高').length * 14 + hits.filter((h) => h.level === '中').length * 7 + hits.filter((h) => h.level === '低').length * 3)
  return {
    score,
    level: score >= 40 ? 'high' : score >= 15 ? 'mid' : 'low',
    sentenceCount: hits.length,
    ruleCount,
    hits,
    elapsedMs: Date.now() - t0,
  }
}

export function useApi() {
  // setup 期就把 Nuxt 上下文拿到手：useAsyncData 的 handler 在 setup 返回之后才执行，
  // 那时再调 useRuntimeConfig() / useState() 会抛 NUXT_E1001，预渲染直接取不到数据。
  const config = useRuntimeConfig()
  const base = String(config.public.apiBase || '').replace(/\/+$/, '')
  const status = useApiStatus()

  function markDegraded(reason: unknown) {
    if (reason instanceof OfflineError) return
    if (!status.value.degraded) {
      status.value = { degraded: true, reason: (reason as Error)?.message || String(reason) }
    }
  }

  /** GET /api/rules?type=&level=&q= */
  async function fetchRules(params: { type?: string; level?: string; q?: string } = {}) {
    try {
      const qs = new URLSearchParams()
      if (params.type) qs.set('type', params.type)
      if (params.level) qs.set('level', params.level)
      if (params.q) qs.set('q', params.q)
      const raw = await getJson<unknown>(base, '/rules' + (qs.toString() ? '?' + qs : ''))
      const list = asList<Rule>(raw)
      if (!list.length && !params.q && !params.type && !params.level) throw new Error('空响应')
      return list
    } catch (e) {
      markDegraded(e)
      // 本地兜底：全量拉一次再按同样条件过滤，保证筛选行为一致
      return filterRules(RULES, params)
    }
  }

  /** GET /api/rules/{id} */
  async function fetchRule(id: string) {
    try {
      const raw = await getJson<Rule>(base, '/rules/' + encodeURIComponent(id))
      if (!raw || !raw.id) throw new Error('空响应')
      return raw
    } catch (e) {
      markDegraded(e)
      return RULES.find((r) => r.id === id) || null
    }
  }

  /** GET /api/traps?type= */
  async function fetchTraps(type?: string) {
    try {
      const raw = await getJson<unknown>(base, '/traps' + (type ? '?type=' + encodeURIComponent(type) : ''))
      const list = asList<Trap>(raw)
      if (!list.length && !type) throw new Error('空响应')
      return list
    } catch (e) {
      markDegraded(e)
      return type ? TRAPS.filter((t) => t.type === type) : TRAPS.slice()
    }
  }

  /** GET /api/certs */
  async function fetchCerts() {
    try {
      const raw = await getJson<unknown>(base, '/certs')
      const list = asList<Cert>(raw)
      if (!list.length) throw new Error('空响应')
      return list
    } catch (e) {
      markDegraded(e)
      return CERTS.slice()
    }
  }

  /** GET /api/stats */
  async function fetchStats() {
    try {
      const raw = await getJson<Stats>(base, '/stats')
      if (!raw || typeof raw.rules !== 'number') throw new Error('空响应')
      return raw
    } catch (e) {
      markDegraded(e)
      return localStats()
    }
  }

  /** POST /api/scan */
  async function scan(text: string) {
    try {
      if (!base) throw new OfflineError('static')
      const res = await fetch(base + '/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ text }),
      })
      if (!res.ok) throw new Error('HTTP ' + res.status)
      const raw = (await res.json()) as unknown
      const data = (raw && typeof raw === 'object' && 'data' in (raw as Record<string, unknown>)
        ? (raw as Record<string, unknown>).data
        : raw) as ScanResult
      if (!data || !Array.isArray(data.hits)) throw new Error('响应结构不符')
      return data
    } catch (e) {
      markDegraded(e)
      return localScan(text)
    }
  }

  return { fetchRules, fetchRule, fetchTraps, fetchCerts, fetchStats, scan, localScan }
}

export function localStats(): Stats {
  const byType: Record<string, number> = {}
  const byLevel: Record<string, number> = {}
  for (const r of RULES) {
    byType[r.type] = (byType[r.type] || 0) + 1
    byLevel[r.level] = (byLevel[r.level] || 0) + 1
  }
  return { rules: RULES.length, traps: TRAPS.length, certs: CERTS.length, byType, byLevel }
}

export function levelLabel(level: string) {
  return level === '高' ? '高风险' : level === '中' ? '中风险' : level === '低' ? '低风险' : level
}

export function levelClass(level: string) {
  return level === '高'
    ? 'bg-danger-soft text-danger border-[#EFCFC9]'
    : level === '中'
      ? 'bg-amber-soft text-amber border-[#F0DDBC]'
      : 'bg-brand-soft text-brand border-[#D3E2F0]'
}
