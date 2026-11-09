<script setup lang="ts">
import type { Cert } from '~/composables/useApi'

const { fetchCerts } = useApi()
const apiStatus = useApiStatus()

useHead({
  title: '考证日历',
  meta: [
    {
      name: 'description',
      content:
        '教师资格证、计算机二级、四六级、普通话、初级会计、驾照：报考门槛、报名与考试窗口、费用口径，以及离最近一次考试还有多久。',
    },
  ],
})

const all = ref<Cert[]>([])
const loading = ref(true)
const level = ref('')

onMounted(async () => {
  all.value = await fetchCerts()
  loading.value = false
})

const filtered = computed(() => all.value.filter((c) => !level.value || c.level === level.value))

const levels = ['门槛低', '门槛中等']

const countText = computed(() => {
  if (loading.value) return '正在读取证书数据…'
  return (level.value ? '筛选到 ' + filtered.value.length + ' 张 / ' : '') + '共 ' + all.value.length + ' 张证书'
})

// 本机倒计时：只存在浏览器里，不上传
const ownDates = ref<Record<string, string>>({})

onMounted(() => {
  try {
    const raw = localStorage.getItem('xc.certDates')
    if (raw) ownDates.value = JSON.parse(raw) || {}
  } catch { /* 忽略损坏的本地数据 */ }
})

function saveDates() {
  try {
    localStorage.setItem('xc.certDates', JSON.stringify(ownDates.value))
  } catch { /* 隐私模式下会失败，不影响页面 */ }
}

function setDate(id: string, v: string) {
  if (v) ownDates.value[id] = v
  else delete ownDates.value[id]
  ownDates.value = { ...ownDates.value }
  saveDates()
}

function clearDate(id: string) {
  delete ownDates.value[id]
  ownDates.value = { ...ownDates.value }
  saveDates()
}

function isoFor(c: Cert) {
  return ownDates.value[c.id] || c.examDate || ''
}

function daysLeft(iso: string): number | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso)
  if (!m) return null
  const target = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])).getTime()
  if (Number.isNaN(target)) return null
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()
  return Math.round((target - today) / 86400000)
}

function countdownText(c: Cert) {
  const iso = isoFor(c)
  const left = daysLeft(iso)
  if (left === null) return { big: '待官网公布', small: '官方尚未公布确切日期', tone: 'pending' }
  if (left > 0) return { big: String(left), small: '天后 · ' + iso + (ownDates.value[c.id] ? '（你自己填的）' : ''), tone: 'ok' }
  if (left === 0) return { big: '就是今天', small: iso + '，记得带身份证和准考证', tone: 'today' }
  return { big: '已过 ' + Math.abs(left) + ' 天', small: iso + '，等下一期公告', tone: 'pending' }
}
</script>

<template>
  <div class="wrap">
    <div class="mb-5">
      <span class="mb-2.5 inline-block rounded-full bg-brand-soft px-2.5 py-[3px] text-xs tracking-[0.14em] text-brand">考证</span>
      <h1 class="!mb-2 text-[26px]">考证日历</h1>
      <p class="mb-0 max-w-[760px] text-ink-2">
        六张大学生最常考的证，按「报考门槛」筛。时间与费用一栏只写口径，<b class="text-ink">一律以官网当期公告为准</b>——考试时间年年调整，我们不复读旧日期，也不替你猜。
      </p>
    </div>

    <div class="mb-4 rounded-[10px] border border-[#F0DDBC] bg-amber-soft px-3.5 py-3 text-[13px] leading-relaxed text-[#7A5214]">
      <b>关于日期：</b>本页不预置任何考试日期。倒计时里显示「待官网公布」的，请点对应官网自己核对；如果你已经查到确切日期，可以在倒计时卡片里填一个，存在你本机，仅用于自己倒计时。
    </div>

    <div
      v-if="apiStatus.degraded"
      class="mb-3.5 rounded-[10px] border border-line bg-[#F7FAFD] px-3.5 py-3 text-[13px] text-ink-2"
    >
      <b>后端未连接：</b>接口请求失败（{{ apiStatus.reason }}），当前显示内置证书快照。
    </div>

    <section class="rounded-xl border border-line bg-white p-5 shadow-sm">
      <div class="mb-3 flex flex-wrap items-center justify-between gap-3">
        <div class="flex flex-wrap gap-2">
          <button
            type="button"
            class="h-8 rounded-full border px-[13px] text-[13px] transition"
            :class="!level ? 'border-brand bg-brand font-bold text-white' : 'border-line bg-white text-ink-2 hover:border-[#C8D4E2] hover:bg-[#F7FAFD]'"
            @click="level = ''"
          >全部</button>
          <button
            v-for="l in levels"
            :key="l"
            type="button"
            class="h-8 rounded-full border px-[13px] text-[13px] transition"
            :class="level === l ? 'border-brand bg-brand font-bold text-white' : 'border-line bg-white text-ink-2 hover:border-[#C8D4E2] hover:bg-[#F7FAFD]'"
            @click="level = level === l ? '' : l"
          >{{ l }}</button>
        </div>
        <span class="text-[13px] text-ink-3">{{ countText }}</span>
      </div>

      <div class="overflow-x-auto rounded-xl border border-line">
        <table class="w-full min-w-[1040px] table-fixed border-collapse text-[13.5px]">
          <thead>
            <tr class="bg-[#F7FAFD] text-[12.5px] text-ink-2">
              <th class="w-[150px] whitespace-nowrap px-3.5 py-3 text-left font-bold">证书</th>
              <th class="w-[80px] whitespace-nowrap px-3.5 py-3 text-left font-bold">门槛</th>
              <th class="w-[190px] px-3.5 py-3 text-left font-bold">适合谁</th>
              <th class="w-[175px] px-3.5 py-3 text-left font-bold">报名窗口</th>
              <th class="w-[175px] px-3.5 py-3 text-left font-bold">考试窗口</th>
              <th class="w-[140px] px-3.5 py-3 text-left font-bold">费用</th>
              <th class="w-[150px] px-3.5 py-3 text-left font-bold">官网／机构</th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="loading">
              <td colspan="7" class="px-3.5 py-10 text-center text-ink-3">正在读取证书数据……</td>
            </tr>
            <tr v-else-if="!filtered.length">
              <td colspan="7" class="px-3.5 py-10 text-center text-ink-3">没有符合条件的证书。</td>
            </tr>
            <tr v-for="c in filtered" :key="c.id" class="border-t border-line">
              <td class="px-3.5 py-3 align-top">
                <b class="text-ink">{{ c.name }}</b>
                <div v-if="c.note" class="mt-1 text-xs text-ink-3">{{ c.note }}</div>
              </td>
              <td class="px-3.5 py-3 align-top">
                <span
                  class="inline-block whitespace-nowrap rounded-full border px-[7px] text-[11px] font-bold leading-[18px]"
                  :class="c.level === '门槛低' ? 'border-[#D3E2F0] bg-brand-soft text-brand' : 'border-[#F0DDBC] bg-amber-soft text-amber'"
                >{{ c.level }}</span>
              </td>
              <td class="px-3.5 py-3 align-top text-ink-2">{{ c.fit }}</td>
              <td class="px-3.5 py-3 align-top text-ink-2">{{ c.signup }}</td>
              <td class="px-3.5 py-3 align-top text-ink-2">{{ c.exam }}</td>
              <td class="px-3.5 py-3 align-top text-ink-2">{{ c.fee }}</td>
              <td class="px-3.5 py-3 align-top text-[12.5px] text-ink-3">
                <a v-if="c.signupUrl" :href="c.signupUrl" target="_blank" rel="noopener noreferrer" class="text-brand">{{ c.official }}</a>
                <span v-else>{{ c.official }}</span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>

    <Card title="距离最近一次考试" class="mt-4">
      <p class="mt-0 text-xs text-ink-3">
        官方还没公布日期的显示「待官网公布」。已公布的，你可以自己填进来，页面会算出还剩多少天；填过的日期只存在本机。
      </p>
      <div v-if="loading" class="py-10 text-center text-sm text-ink-3">正在读取证书数据……</div>
      <div v-else class="grid gap-3.5 md:grid-cols-2">
        <div v-for="c in filtered" :key="c.id" class="rounded-xl border border-line bg-white p-4">
          <h3 class="!mb-1 !text-[15.5px]">{{ c.name }}</h3>
          <div class="mb-2.5 text-xs text-ink-3">{{ c.level }} · {{ c.official }}</div>

          <div
            class="mb-2.5 flex items-baseline gap-2 rounded-[9px] border border-dashed px-3.5 py-2.5"
            :class="countdownText(c).tone === 'today'
              ? 'border-[#EFCFC9] bg-danger-soft'
              : countdownText(c).tone === 'ok'
                ? 'border-[#CDE6D8] bg-ok-soft'
                : 'border-[#D9E2EC] bg-[#F7FAFD]'"
          >
            <b
              class="leading-none"
              :class="countdownText(c).tone === 'ok' ? 'text-[26px] text-brand' : 'text-[15px] text-ink-2'"
            >{{ countdownText(c).big }}</b>
            <span class="text-xs text-ink-3">{{ countdownText(c).small }}</span>
          </div>

          <div class="flex flex-wrap items-center gap-2">
            <input
              :value="isoFor(c)"
              type="date"
              class="h-[34px] min-w-[130px] flex-1 rounded-lg border border-line px-2.5 text-[13px] outline-none focus:border-brand-2"
              :aria-label="'设置' + c.name + '的考试日期'"
              @change="setDate(c.id, ($event.target as HTMLInputElement).value)"
            >
            <button
              v-if="ownDates[c.id]"
              type="button"
              class="h-[34px] rounded-lg px-2.5 text-[13px] text-ink-3 hover:bg-[#EDF1F6]"
              @click="clearDate(c.id)"
            >清除</button>
          </div>
          <p class="mb-0 mt-2 text-xs text-ink-3">日期以官网当期公告为准；填在这里只用于本机倒计时。</p>
        </div>
      </div>
    </Card>

    <Card title="考证这件事，说几句实话" class="mt-4">
      <ul class="mb-0 pl-5 text-sm text-ink-2">
        <li><b class="text-ink">证不是越多越好。</b>先看目标岗位的招聘要求，要求里没写的证，优先级往后排。</li>
        <li><b class="text-ink">看报名条件。</b>四六级只限在校生，初级会计要高中及以上学历，教师资格认定还要普通话证书，卡在资格上比卡在考试上更常见。</li>
        <li><b class="text-ink">时间以官网为准。</b>各省报名时间、费用、审核方式都不同；本页只给口径，不替代官网公告。</li>
        <li><b class="text-ink">报名费之外还有隐性成本。</b>教材、培训、跨市考试的交通住宿，都要算进去。</li>
      </ul>
    </Card>
  </div>
</template>
