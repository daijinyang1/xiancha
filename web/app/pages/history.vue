<script setup lang="ts">
import { LOCAL_HISTORY_MAX, dayKey, formatTime, readLocalHistory } from '~/composables/useApi'
import type { ScanDayPoint, ScanRecord, ScanStats } from '~/composables/useApi'

const { fetchScanHistory, fetchScanStats } = useApi()
const apiStatus = useApiStatus()

useHead({
  title: '扫描历史',
  meta: [
    {
      name: 'description',
      content:
        '回看你在「先查」做过的合同扫描：每次的时间、命中句数、命中规则数、风险分与风险档位，以及近 7 天的扫描量与平均分趋势。',
    },
  ],
})

// 构建期取数：本机全栈模式拿到后端记录与聚合统计；线上静态站两个接口都是空的，
// 页面靠下面的本机记录（localStorage）把这一页填满，不会出现空白页。
const { data: remote } = await useAsyncData('xc-history-page', async () => {
  const [list, stats] = await Promise.all([fetchScanHistory(LOCAL_HISTORY_MAX), fetchScanStats()])
  return { list, stats }
})

/** 服务端来源（本机全栈有数据，线上为空数组） */
const serverRecords = ref<ScanRecord[]>(remote.value?.list || [])
const serverStats = ref<ScanStats>(remote.value?.stats || { total: 0, today: 0, avgScore: 0, highCount: 0, midCount: 0, lowCount: 0, last7Days: [] })

/** 本机来源：只有浏览器里有，挂载后再读，避免 SSR/预渲染读到 undefined */
const localRecords = ref<ScanRecord[]>([])
onMounted(() => {
  localRecords.value = readLocalHistory()
})

/** 双源合并：按时间倒序，同 id 只留一条 */
const merged = computed<ScanRecord[]>(() => {
  const seen = new Set<string>()
  return [...localRecords.value, ...serverRecords.value]
    .filter((r) => {
      if (!r.id || seen.has(r.id)) return false
      seen.add(r.id)
      return true
    })
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
})

const hasAny = computed(() => merged.value.length > 0)

/** 顶部 KPI：服务端聚合 + 本机记录合并计数 */
const kpi = computed(() => {
  const todayKey = dayKey(new Date())
  const localToday = localRecords.value.filter((r) => dayKey(new Date(r.createdAt)) === todayKey).length
  const total = serverStats.value.total + localRecords.value.length
  const today = serverStats.value.today + localToday
  const scoreSum =
    serverStats.value.avgScore * serverStats.value.total + localRecords.value.reduce((n, r) => n + r.score, 0)
  const scannedCount = serverStats.value.total + localRecords.value.length
  const avgScore = scannedCount ? Math.round(scoreSum / scannedCount) : 0
  return { total, today, avgScore }
})

/** 风险档位分布（合并口径） */
const levelBreakdown = computed(() => {
  const base = {
    高: serverStats.value.highCount,
    中: serverStats.value.midCount,
    低: serverStats.value.lowCount,
  } as Record<string, number>
  for (const r of localRecords.value) {
    const lv = r.score >= 40 ? '高' : r.score >= 15 ? '中' : '低'
    base[lv] = (base[lv] || 0) + 1
  }
  const total = base.高 + base.中 + base.低
  const pct = (n: number) => (total ? Math.round((n / total) * 100) : 0)
  return [
    { label: '高风险（≥40 分）', key: '高', count: base.高, percent: pct(base.高), bar: 'bg-danger' },
    { label: '中风险（15–39 分）', key: '中', count: base.中, percent: pct(base.中), bar: 'bg-amber' },
    { label: '低风险（<15 分）', key: '低', count: base.低, percent: pct(base.低), bar: 'bg-brand-2' },
  ]
})

/** 近 7 天：以今天为终点倒推 7 天，服务端与本地两条来源按天相加 */
const last7 = computed<ScanDayPoint[]>(() => {
  const byDate: Record<string, { count: number; scoreSum: number }> = {}
  const bump = (date: string, count: number, scoreSum: number) => {
    if (!byDate[date]) byDate[date] = { count: 0, scoreSum: 0 }
    byDate[date].count += count
    byDate[date].scoreSum += scoreSum
  }
  for (const d of serverStats.value.last7Days || []) bump(d.date, d.count, d.avgScore * d.count)
  for (const r of localRecords.value) bump(dayKey(new Date(r.createdAt)), 1, r.score)

  const days: ScanDayPoint[] = []
  const now = new Date()
  for (let i = 6; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i)
    const key = dayKey(d)
    const hit = byDate[key] || { count: 0, scoreSum: 0 }
    days.push({
      date: key,
      count: hit.count,
      avgScore: hit.count ? Math.round(hit.scoreSum / hit.count) : 0,
    })
  }
  return days
})

const maxDayCount = computed(() => Math.max(1, ...last7.value.map((d) => d.count)))
const weekTotal = computed(() => last7.value.reduce((n, d) => n + d.count, 0))

function barHeight(count: number) {
  if (!count) return 3
  return Math.max(6, Math.round((count / maxDayCount.value) * 100))
}

function levelBadge(score: number) {
  if (score >= 40) return { text: '高风险', cls: 'bg-danger-soft text-danger border-[#EFCFC9]' }
  if (score >= 15) return { text: '中风险', cls: 'bg-amber-soft text-amber border-[#F0DDBC]' }
  return { text: '低风险', cls: 'bg-brand-soft text-brand border-[#D3E2F0]' }
}

function levelLabelOf(r: ScanRecord) {
  return r.level === '高' || r.level === '中' || r.level === '低' ? r.level : ''
}
</script>

<template>
  <div class="wrap">
    <Reveal>
      <div class="mb-5">
        <span class="mb-2.5 inline-block rounded-full bg-brand-soft px-2.5 py-[3px] text-xs tracking-[0.14em] text-brand">历史记录</span>
        <h1 class="!mb-2 text-[26px]">扫描历史</h1>
        <p class="mb-0 max-w-[760px] text-ink-2">
          回看你在这台设备上做过的扫描：什么时候扫的、命中了几句、踩中几条规则、风险分落在哪一档。这里只记分数与计数，
          <b class="text-ink">不保存合同原文</b>——原文从来没有离开过你的浏览器。
        </p>
      </div>
    </Reveal>

    <div
      v-if="apiStatus.degraded"
      class="mb-3.5 rounded-[10px] border border-[#F0DDBC] bg-amber-soft px-3.5 py-3 text-[13px] text-[#7A5214]"
    >
      <b>后端未连接：</b>接口请求失败（{{ apiStatus.reason }}），当前只显示这台设备本机记录的历史。
    </div>

    <Reveal :delay="60">
      <div class="mb-3.5 rounded-[10px] border border-[#D3E2F0] bg-brand-soft px-3.5 py-3 text-[13px] leading-relaxed text-[#1B4266]">
        <b>这份记录存在哪：</b>线上是纯静态站，没有账号也没有服务器数据库，所以每次扫描的结果都写进你浏览器本机（最多留 {{ LOCAL_HISTORY_MAX }} 条）。
        换设备、换浏览器、清缓存都会看不到；本机全栈模式下还会额外显示一份服务端记录，两者在这里合并展示，带「本机」标记的是本机那份。
      </div>
    </Reveal>

    <!-- KPI -->
    <Reveal :delay="120">
      <div class="grid gap-3.5 sm:grid-cols-3">
        <div class="rounded-xl border border-line bg-white p-5 shadow-sm">
          <div class="text-xs text-ink-3">累计扫描</div>
          <div class="mt-1 text-[30px] font-bold leading-none text-brand">
            <CountUp :to="kpi.total" suffix=" 次" />
          </div>
          <div class="mt-1.5 text-xs text-ink-3">服务端 {{ serverStats.total }} 次 + 本机 {{ localRecords.length }} 次</div>
        </div>
        <div class="rounded-xl border border-line bg-white p-5 shadow-sm">
          <div class="text-xs text-ink-3">今天扫了</div>
          <div class="mt-1 text-[30px] font-bold leading-none text-brand-2">
            <CountUp :to="kpi.today" suffix=" 次" />
          </div>
          <div class="mt-1.5 text-xs text-ink-3">只统计本机今天日期的记录</div>
        </div>
        <div class="rounded-xl border border-line bg-white p-5 shadow-sm">
          <div class="text-xs text-ink-3">平均风险分</div>
          <div class="mt-1 text-[30px] font-bold leading-none text-ink">
            <CountUp :to="kpi.avgScore" suffix=" 分" />
          </div>
          <div class="mt-1.5 text-xs text-ink-3">越高越说明合同里套路密集</div>
        </div>
      </div>
    </Reveal>

    <!-- 近 7 天 -->
    <Reveal :delay="160">
      <Card title="近 7 天扫描量" class="mt-4">
        <template #head>
          <span class="text-xs text-ink-3">合计 {{ weekTotal }} 次 · 柱子越高扫得越多</span>
        </template>
        <div class="flex h-[150px] items-end gap-2 sm:gap-3">
          <div v-for="d in last7" :key="d.date" class="flex min-w-0 flex-1 flex-col items-center justify-end gap-1.5">
            <span class="text-[11px] tabular-nums text-ink-3">{{ d.count || '' }}</span>
            <div class="flex h-[100px] w-full items-end">
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
        <p class="mb-0 mt-2 text-xs text-ink-3">横轴是最近 7 天（含今天），灰柱表示那天没有扫描记录。</p>
      </Card>
    </Reveal>

    <!-- 档位分布 -->
    <Reveal :delay="200">
      <Card title="风险档位分布" class="mt-4">
        <div class="space-y-3">
          <div v-for="row in levelBreakdown" :key="row.key" class="flex items-center gap-3">
            <span class="w-[132px] flex-none text-[13px] text-ink-2">{{ row.label }}</span>
            <span class="h-[10px] flex-1 overflow-hidden rounded-full bg-[#EDF1F6]">
              <span
                class="block h-full rounded-full bar-x"
                :class="row.bar"
                :style="{ width: row.percent + '%' }"
              />
            </span>
            <span class="w-[76px] flex-none text-right text-[13px] tabular-nums text-ink-3">{{ row.count }} 次 · {{ row.percent }}%</span>
          </div>
        </div>
        <p class="mb-0 mt-3 text-xs text-ink-3">
          分档口径与扫描页一致：≥40 分算高风险，15–39 分算中风险，其余算低风险。档位只是提示，不是法律结论。
        </p>
      </Card>
    </Reveal>

    <!-- 记录列表 -->
    <Reveal :delay="240">
      <Card title="扫描记录" class="mt-4">
        <template #head>
          <span class="text-xs text-ink-3">最多显示最近 {{ LOCAL_HISTORY_MAX }} 条</span>
        </template>

        <div v-if="!hasAny" class="tex-hatch rounded-[10px] border border-dashed border-line bg-[#FBFCFE] px-5 py-10 text-center">
          <p class="mb-1.5 text-[15px] font-bold text-ink">还没有扫描记录</p>
          <p class="mb-4 text-[13px] text-ink-2">
            扫一份合同就会有一条记录：只存时间、命中句数、命中规则数和风险分，不存原文。
            第一次用的话，建议先拿示例合同跑一遍，看看每个风险点长什么样。
          </p>
          <NuxtLink
            to="/scan"
            class="inline-flex h-[38px] items-center justify-center rounded-[9px] bg-brand px-4 text-sm font-bold text-white no-underline btn-x hover:bg-[#1A4368] hover:no-underline"
          >
            去扫描我的合同 →
          </NuxtLink>
        </div>

        <div v-else class="overflow-x-auto rounded-[10px] border border-line">
          <table class="table-x min-w-[680px]">
            <caption class="sr-only">扫描记录：时间、命中句数、命中规则数、风险分、档位与来源</caption>
            <thead>
              <tr>
                <th class="whitespace-nowrap">时间</th>
                <th class="num">命中句</th>
                <th class="num">命中规则</th>
                <th class="num">风险分</th>
                <th>档位</th>
                <th>来源</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="r in merged" :key="r.id">
                <td class="whitespace-nowrap text-ink-2">{{ formatTime(r.createdAt) }}</td>
                <td class="num text-ink-2">{{ r.sentenceHits }}</td>
                <td class="num text-ink-2">{{ r.ruleHits }}</td>
                <td class="num font-bold text-ink">{{ r.score }}</td>
                <td>
                  <span class="inline-flex items-center whitespace-nowrap rounded-full border px-[7px] text-[11px] font-bold leading-[18px]" :class="levelBadge(r.score).cls">
                    <span class="dot-status" aria-hidden="true" />
                    {{ levelLabelOf(r) || levelBadge(r.score).text }}
                  </span>
                </td>
                <td>
                  <span v-if="r.local" class="inline-flex items-center rounded-[4px] border border-line bg-[#EFF2F6] px-1.5 text-[11px] font-bold leading-[18px] text-ink-3"><span class="dot-status is-hollow" aria-hidden="true" />本机</span>
                  <span v-else class="text-[12px] text-ink-3">服务端</span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <div class="mt-4 flex flex-wrap items-center gap-2.5">
          <NuxtLink
            to="/scan"
            class="inline-flex h-[34px] items-center justify-center rounded-[9px] border border-line bg-white px-3.5 text-[13px] text-ink-2 no-underline btn-x hover:border-[#C8D4E2] hover:bg-[#F7FAFD] hover:no-underline"
          >
            再扫一份 →
          </NuxtLink>
          <NuxtLink
            to="/stats"
            class="inline-flex h-[34px] items-center justify-center rounded-[9px] border border-line bg-white px-3.5 text-[13px] text-ink-2 no-underline btn-x hover:border-[#C8D4E2] hover:bg-[#F7FAFD] hover:no-underline"
          >
            看数据总览 →
          </NuxtLink>
        </div>
      </Card>
    </Reveal>

    <Reveal :delay="280">
      <Card title="为什么要分两个来源" class="mt-4">
        <ul class="mb-0 list-none p-0">
          <li class="border-b border-dashed border-line py-2 text-sm text-ink-2 last:border-b-0">
            <b class="text-ink">线上是纯静态站。</b>没有后端进程、没有数据库，浏览器里的扫描结果没法写回服务器，所以只能存在你本机。
          </li>
          <li class="border-b border-dashed border-line py-2 text-sm text-ink-2 last:border-b-0">
            <b class="text-ink">本机全栈模式另有一份。</b>用「启动.bat」跑起来时，扫描会写进 PostgreSQL 的扫描日志，那份记录跨浏览器可见，也只存分数与计数。
          </li>
          <li class="border-b border-dashed border-line py-2 text-sm text-ink-2 last:border-b-0">
            <b class="text-ink">两处都不存原文。</b>无论哪一份，都只有时间、命中句数、命中规则数、风险分这四个数字，合同正文不会被保存。
          </li>
        </ul>
      </Card>
    </Reveal>
  </div>
</template>
