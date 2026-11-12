<script setup lang="ts">
import { RULE_TYPES, dayKey, readLocalHistory } from '~/composables/useApi'
import type { Health, ScanDayPoint, ScanStats, Stats } from '~/composables/useApi'

const { fetchStats, fetchScanStats, fetchHealth } = useApi()
const apiStatus = useApiStatus()

useHead({
  title: '数据总览',
  meta: [
    {
      name: 'description',
      content:
        '「先查」的数据总览：规则与案例的规模、8 类坑型分布、风险等级分布，以及扫描量与平均分的近 7 天趋势。所有数字都来自同一份规则库。',
    },
  ],
})

// 构建期取数：库规模型数据（规则/案例/证书/坑型）静态站也能算出来；
// 扫描统计在线上是空的，挂载后由本机记录补上。
const { data: lib } = await useAsyncData('xc-stats-page', async () => {
  const [stats, scanStats] = await Promise.all([fetchStats(), fetchScanStats()])
  return { stats, scanStats }
})

const stats = ref<Stats>(lib.value?.stats || { rules: 0, traps: 0, certs: 0, byType: {}, byLevel: {} })
const scanStats = ref<ScanStats>(lib.value?.scanStats || { total: 0, today: 0, avgScore: 0, highCount: 0, midCount: 0, lowCount: 0, last7Days: [] })

/** 本机扫描记录：只存在浏览器里，挂载后补进来 */
const localCount = ref(0)
const localScoreSum = ref(0)
const localByDay = ref<Record<string, { count: number; scoreSum: number }>>({})

onMounted(() => {
  const list = readLocalHistory()
  localCount.value = list.length
  localScoreSum.value = list.reduce((n, r) => n + r.score, 0)
  const byDay: Record<string, { count: number; scoreSum: number }> = {}
  for (const r of list) {
    const k = dayKey(new Date(r.createdAt))
    if (!byDay[k]) byDay[k] = { count: 0, scoreSum: 0 }
    byDay[k].count += 1
    byDay[k].scoreSum += r.score
  }
  localByDay.value = byDay
})

/** 8 类坑型：按规则条数排序（没有规则的坑型也留着，标 0） */
const typeRows = computed(() => {
  const byType = stats.value.byType || {}
  const rows = RULE_TYPES.map((t) => ({ type: t as string, count: byType[t] || 0 }))
  const extra = Object.entries(byType)
    .filter(([k]) => !(RULE_TYPES as readonly string[]).includes(k))
    .map(([type, count]) => ({ type, count }))
  const all = [...rows, ...extra].sort((a, b) => b.count - a.count)
  const max = Math.max(1, ...all.map((r) => r.count))
  return all.map((r) => ({ ...r, width: r.count ? Math.max(6, Math.round((r.count / max) * 100)) : 0 }))
})

const typeTotal = computed(() => typeRows.value.reduce((n, r) => n + r.count, 0))

/** 规则等级分布（高/中/低） */
const levelRows = computed(() => {
  const byLevel = stats.value.byLevel || {}
  const high = byLevel['高'] || 0
  const mid = byLevel['中'] || 0
  const low = byLevel['低'] || 0
  const total = high + mid + low
  const pct = (n: number) => (total ? Math.round((n / total) * 100) : 0)
  return [
    { key: '高', label: '高风险规则', count: high, percent: pct(high), bar: 'bg-danger' },
    { key: '中', label: '中风险规则', count: mid, percent: pct(mid), bar: 'bg-amber' },
    { key: '低', label: '低风险规则', count: low, percent: pct(low), bar: 'bg-brand-2' },
  ]
})

/** 扫描侧合计（服务端 + 本机） */
const scanKpi = computed(() => {
  const total = scanStats.value.total + localCount.value
  const scoreSum = scanStats.value.avgScore * scanStats.value.total + localScoreSum.value
  return {
    total,
    avgScore: total ? Math.round(scoreSum / total) : 0,
  }
})

/** 近 7 天趋势：服务端聚合与本机记录按天相加 */
const last7 = computed<ScanDayPoint[]>(() => {
  const byDate: Record<string, { count: number; scoreSum: number }> = {}
  const bump = (date: string, count: number, scoreSum: number) => {
    if (!byDate[date]) byDate[date] = { count: 0, scoreSum: 0 }
    byDate[date].count += count
    byDate[date].scoreSum += scoreSum
  }
  for (const d of scanStats.value.last7Days || []) bump(d.date, d.count, d.avgScore * d.count)
  for (const [k, v] of Object.entries(localByDay.value)) bump(k, v.count, v.scoreSum)

  const days: ScanDayPoint[] = []
  const now = new Date()
  for (let i = 6; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i)
    const key = dayKey(d)
    const hit = byDate[key] || { count: 0, scoreSum: 0 }
    days.push({ date: key, count: hit.count, avgScore: hit.count ? Math.round(hit.scoreSum / hit.count) : 0 })
  }
  return days
})

const maxDayCount = computed(() => Math.max(1, ...last7.value.map((d) => d.count)))
const weekTotal = computed(() => last7.value.reduce((n, d) => n + d.count, 0))

function barHeight(count: number) {
  if (!count) return 3
  return Math.max(6, Math.round((count / maxDayCount.value) * 100))
}

/**
 * 数据源健康状态：本机全栈时能读到后端版本与运行时长；
 * 线上静态站拿到的是 'static'（随包快照），照样能显示口径，不会报错。
 */
const { data: healthData } = await useAsyncData('xc-stats-health', () => fetchHealth())
const health = computed<Health>(
  () =>
    healthData.value || {
      status: 'static',
      db: false,
      rules: 0,
      traps: 0,
      certs: 0,
      uptimeSec: 0,
      version: '',
    },
)

/** 三种状态给人话，不暴露内部实现 */
const healthRows = computed(() => {
  const h = health.value
  const isLive = h.status === 'ok' || h.status === 'up'
  return [
    {
      k: '数据来源',
      v: isLive ? '本机全栈后端' : '随包快照',
      d: isLive
        ? '本次构建连上了 /api/health，规则、案例、证书都从数据库读出后写进页面。'
        : '线上是纯静态站，构建时用的是随包发布的同一份数据快照，与数据库真源逐条对齐。',
    },
    {
      k: '数据库',
      v: isLive ? (h.db ? '已连接' : '未连接') : '不适用',
      d: isLive ? '后端返回的数据库连通状态。' : '静态站不连数据库，页面内容在构建时已经固化。',
    },
    {
      k: '版本',
      v: isLive ? h.version || '未标注' : '构建期快照',
      d: '后端版本号；静态站没有后端进程，这里标的是数据快照口径。',
    },
    {
      k: '规则 / 案例 / 证书',
      v: h.rules + ' / ' + h.traps + ' / ' + h.certs,
      d: '后端自报的三项规模，应当与上面四张 KPI 卡完全一致。',
    },
  ]
})
</script>

<template>
  <div class="wrap">
    <Reveal>
      <div class="mb-5">
        <span class="mb-2.5 inline-block rounded-full bg-brand-soft px-2.5 py-[3px] text-xs tracking-[0.14em] text-brand">数据</span>
        <h1 class="!mb-2 text-[26px]">数据总览</h1>
        <p class="mb-0 max-w-[760px] text-ink-2">
          这一页把「先查」现在到底有多少东西摊开给你看：规则多少条、案例多少条、证书多少张、八类坑型各占几条，
          以及这些数据是怎么被扫出来的。数字都来自同一份规则库，页面上不写死任何一个。
        </p>
      </div>
    </Reveal>

    <div
      v-if="apiStatus.degraded"
      class="mb-3.5 rounded-[10px] border border-[#F0DDBC] bg-amber-soft px-3.5 py-3 text-[13px] text-[#7A5214]"
    >
      <b>后端未连接：</b>接口请求失败（{{ apiStatus.reason }}），当前显示随包快照的统计数字。
    </div>

    <!-- 规模 KPI -->
    <Reveal :delay="60">
      <div class="grid gap-3.5 sm:grid-cols-2 lg:grid-cols-4">
        <div class="rounded-xl border border-line bg-white p-5 shadow-sm">
          <div class="flex items-center gap-2 text-xs text-ink-3">
            <span class="flex h-6 w-6 items-center justify-center rounded-md bg-brand-soft text-brand"><EntryIcon name="rules" /></span>
            风险规则
          </div>
          <div class="mt-2 text-[30px] font-bold leading-none text-brand">
            <CountUp :to="stats.rules" suffix=" 条" />
          </div>
          <div class="mt-1.5 text-xs text-ink-3">每条都有一页词条</div>
        </div>
        <div class="rounded-xl border border-line bg-white p-5 shadow-sm">
          <div class="flex items-center gap-2 text-xs text-ink-3">
            <span class="flex h-6 w-6 items-center justify-center rounded-md bg-danger-soft text-danger"><EntryIcon name="traps" /></span>
            避坑案例
          </div>
          <div class="mt-2 text-[30px] font-bold leading-none text-danger">
            <CountUp :to="stats.traps" suffix=" 条" />
          </div>
          <div class="mt-1.5 text-xs text-ink-3">全部脱敏改写</div>
        </div>
        <div class="rounded-xl border border-line bg-white p-5 shadow-sm">
          <div class="flex items-center gap-2 text-xs text-ink-3">
            <span class="flex h-6 w-6 items-center justify-center rounded-md bg-amber-soft text-amber"><EntryIcon name="certs" /></span>
            考证信息
          </div>
          <div class="mt-2 text-[30px] font-bold leading-none text-amber">
            <CountUp :to="stats.certs" suffix=" 张" />
          </div>
          <div class="mt-1.5 text-xs text-ink-3">只写口径，不猜日期</div>
        </div>
        <div class="rounded-xl border border-line bg-white p-5 shadow-sm">
          <div class="flex items-center gap-2 text-xs text-ink-3">
            <span class="flex h-6 w-6 items-center justify-center rounded-md bg-ok-soft text-ok"><EntryIcon name="stats" /></span>
            坑型分类
          </div>
          <div class="mt-2 text-[30px] font-bold leading-none text-ok">
            <CountUp :to="typeRows.filter((r) => r.count > 0).length" suffix=" 类" />
          </div>
          <div class="mt-1.5 text-xs text-ink-3">押金到离职，覆盖签约全流程</div>
        </div>
      </div>
    </Reveal>

    <!-- 8 类坑型分布 -->
    <Reveal :delay="100">
      <Card title="八类坑型分布" class="mt-4">
        <template #head>
          <span class="text-xs text-ink-3">合计 {{ typeTotal }} 条规则 · 按条数排序</span>
        </template>
        <div class="space-y-2.5">
          <div v-for="row in typeRows" :key="row.type" class="flex items-center gap-3">
            <NuxtLink
              :to="{ path: '/rules', query: { type: row.type } }"
              class="w-[74px] flex-none text-[13px] text-ink-2 no-underline hover:text-brand hover:underline"
            >{{ row.type }}</NuxtLink>
            <span class="h-[12px] flex-1 overflow-hidden rounded-full bg-[#EDF1F6]">
              <span
                class="block h-full rounded-full bg-brand-2 bar-x"
                :style="{ width: row.width + '%' }"
              />
            </span>
            <span class="w-[54px] flex-none text-right text-[13px] tabular-nums text-ink-3">{{ row.count }} 条</span>
          </div>
        </div>
        <p class="mb-0 mt-3 text-xs text-ink-3">点坑型名字跳到规则页并按该类型筛好，省得自己再点一遍。</p>
      </Card>
    </Reveal>

    <!-- 规则等级分布 -->
    <Reveal :delay="140">
      <Card title="规则的风险等级分布" class="mt-4">
        <div class="space-y-3">
          <div v-for="row in levelRows" :key="row.key" class="flex items-center gap-3">
            <span class="w-[96px] flex-none text-[13px] text-ink-2">{{ row.label }}</span>
            <span class="h-[10px] flex-1 overflow-hidden rounded-full bg-[#EDF1F6]">
              <span class="block h-full rounded-full bar-x" :class="row.bar" :style="{ width: row.percent + '%' }" />
            </span>
            <span class="w-[76px] flex-none text-right text-[13px] tabular-nums text-ink-3">{{ row.count }} 条 · {{ row.percent }}%</span>
          </div>
        </div>
        <p class="mb-0 mt-3 text-xs text-ink-3">
          等级只看「签了之后有多难挽回」：押金、培训贷、违约金这类直接卡钱的算高；加班费、社保折现这类可追讨的算中；表述不规范但影响较小的算低。
        </p>
      </Card>
    </Reveal>

    <!-- 扫描侧 -->
    <Reveal :delay="180">
      <Card title="扫描使用情况" class="mt-4">
        <template #head>
          <span class="text-xs text-ink-3">服务端 {{ scanStats.total }} 次 + 本机 {{ localCount }} 次</span>
        </template>
        <div class="grid gap-3.5 sm:grid-cols-3">
          <div class="rounded-[10px] border border-line bg-[#FBFCFE] p-4">
            <div class="text-xs text-ink-3">累计扫描</div>
            <div class="mt-1 text-[26px] font-bold leading-none text-brand"><CountUp :to="scanKpi.total" suffix=" 次" /></div>
          </div>
          <div class="rounded-[10px] border border-line bg-[#FBFCFE] p-4">
            <div class="text-xs text-ink-3">近 7 天扫描</div>
            <div class="mt-1 text-[26px] font-bold leading-none text-brand-2"><CountUp :to="weekTotal" suffix=" 次" /></div>
          </div>
          <div class="rounded-[10px] border border-line bg-[#FBFCFE] p-4">
            <div class="text-xs text-ink-3">平均风险分</div>
            <div class="mt-1 text-[26px] font-bold leading-none text-ink"><CountUp :to="scanKpi.avgScore" suffix=" 分" /></div>
          </div>
        </div>

        <p class="mb-2 mt-4 text-[13px] font-bold text-ink-2">近 7 天扫描量</p>
        <div class="flex h-[130px] items-end gap-2 sm:gap-3">
          <div v-for="d in last7" :key="d.date" class="flex min-w-0 flex-1 flex-col items-center justify-end gap-1.5">
            <span class="text-[11px] tabular-nums text-ink-3">{{ d.count || '' }}</span>
            <div class="flex h-[84px] w-full items-end">
              <div
                class="w-full rounded-t-[4px] bar-x"
                :class="d.count ? 'bg-brand-2' : 'bg-[#E7ECF3]'"
                :style="{ height: barHeight(d.count) + '%' }"
                :title="d.date + '：' + d.count + ' 次，平均 ' + d.avgScore + ' 分'"
              />
            </div>
            <span class="whitespace-nowrap text-[11px] text-ink-3">{{ d.date.slice(5) }}</span>
          </div>
        </div>

        <p v-if="!scanKpi.total" class="tex-hatch mb-0 mt-3 rounded-[10px] border border-dashed border-line bg-[#FBFCFE] px-3.5 py-3 text-xs text-ink-3">
          还没有扫描记录。线上静态站不存服务端日志，这里显示的是你本机浏览器的记录 ——
          <NuxtLink to="/scan" class="link-underline font-bold text-brand-2">扫一份合同</NuxtLink>
          之后就会有数。
        </p>
        <p v-else class="mb-0 mt-3 text-xs text-ink-3">
          记录只含时间、命中句数、命中规则数和风险分，不保存合同原文。
          <NuxtLink to="/history" class="link-underline font-bold text-brand-2">看逐条明细 →</NuxtLink>
        </p>
      </Card>
    </Reveal>

    <!-- 数据源状态 -->
    <Reveal :delay="180">
      <Card title="这些数字从哪来" class="mt-4">
        <div class="overflow-hidden rounded-[10px] border border-line">
          <div
            v-for="(row, i) in healthRows"
            :key="row.k"
            class="grid grid-cols-1 gap-1 border-line px-3.5 py-3 sm:grid-cols-[128px_150px_1fr] sm:items-baseline sm:gap-4"
            :class="i ? 'border-t' : ''"
          >
            <div class="text-xs tracking-[0.08em] text-ink-3">{{ row.k }}</div>
            <div class="text-sm font-bold text-ink">{{ row.v }}</div>
            <div class="text-xs leading-relaxed text-ink-2">{{ row.d }}</div>
          </div>
        </div>
        <p class="mb-0 mt-3 text-xs text-ink-3">
          这一栏是自检用的：如果自报规模和上面的 KPI 对不上，说明快照导出落后于数据库，重跑
          <code class="rounded bg-[#F2F5F9] px-1 py-[1px] text-[12px]">node tools/db-export.mjs</code>
          再构建即可。
        </p>
      </Card>
    </Reveal>

    <!-- 口径说明 -->
    <Reveal :delay="220">
      <Card title="这些数字怎么算的" class="mt-4">
        <ul class="mb-0 list-none p-0">
          <li class="border-b border-dashed border-line py-2 text-sm text-ink-2 last:border-b-0">
            <b class="text-ink">规模数字（规则/案例/证书/坑型）</b>来自后端 /api/stats；线上静态站没有后端，退回随包发布的同一份快照，口径完全一致。
          </li>
          <li class="border-b border-dashed border-line py-2 text-sm text-ink-2 last:border-b-0">
            <b class="text-ink">坑型分布</b>是把 {{ stats.rules }} 条规则按 type 字段分组计数，一条规则只属于一个坑型，加起来必须等于规则总数（现在合计 {{ typeTotal }} 条）。
          </li>
          <li class="border-b border-dashed border-line py-2 text-sm text-ink-2 last:border-b-0">
            <b class="text-ink">扫描统计</b>分两处：本机全栈模式写在 PostgreSQL 的 scan_log 表；线上静态站写进浏览器本机，最多留 30 条。这一页把两处相加。
          </li>
          <li class="border-b border-dashed border-line py-2 text-sm text-ink-2 last:border-b-0">
            <b class="text-ink">风险分</b>按命中的句子分档累加（高 14 分、中 7 分、低 3 分，封顶 100），同一句命中多条规则不重复计分——所以「命中 9 句 / 12 条规则」这种数字是正常的。
          </li>
        </ul>
      </Card>
    </Reveal>

    <Reveal :delay="260">
      <div class="mt-4 flex flex-wrap items-center gap-2.5">
        <NuxtLink
          to="/rules"
          class="inline-flex h-[38px] items-center justify-center rounded-[9px] bg-brand px-4 text-sm font-bold text-white no-underline btn-x hover:bg-[#1A4368] hover:no-underline"
        >去查规则词条</NuxtLink>
        <NuxtLink
          to="/history"
          class="inline-flex h-[38px] items-center justify-center rounded-[9px] border border-line bg-white px-4 text-sm text-ink-2 no-underline btn-x hover:border-[#C8D4E2] hover:bg-[#F7FAFD] hover:no-underline"
        >看扫描历史</NuxtLink>
        <NuxtLink
          to="/about"
          class="inline-flex h-[38px] items-center justify-center rounded-[9px] border border-line bg-white px-4 text-sm text-ink-2 no-underline btn-x hover:border-[#C8D4E2] hover:bg-[#F7FAFD] hover:no-underline"
        >数据口径与边界</NuxtLink>
      </div>
    </Reveal>
  </div>
</template>
