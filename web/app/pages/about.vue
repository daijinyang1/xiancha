<script setup lang="ts">
useHead({
  title: '关于我们',
  meta: [
    {
      name: 'description',
      content:
        '「先查」是一个大学生查询站，先做就业避坑这一格：合同风险扫描、避坑案例库、考证日历、扫描历史与数据总览。两个人做，所有内容都可核、有出处。',
    },
  ],
})

/** 三层规划：现在做了什么、排队做什么、明确不做什么 */
const layers = [
  {
    tag: '第一层 · 现在就能查',
    tone: 'ok',
    items: [
      '合同风险扫描：粘一份实习合同，本机逐句标出押金、培训贷、无薪试岗、违约金这些坑',
      '避坑案例库：脱敏改写的真实套路，按 8 类坑型筛选',
      '规则词条：每条写清命中长什么样、依据哪一条法律、该怎么改',
      '考证日历：六张大学生最常考的证，报名窗口与费用口径',
      '扫描历史与数据总览：只记分数与计数，不存合同原文',
    ],
  },
  {
    tag: '第二层 · 排队中',
    tone: 'amber',
    items: [
      '三方协议与档案：报到证、档案去向、违约条款',
      '社保与公积金：应届生第一份工作最容易漏的两项',
      '租房押金：实习期租房最常见的一笔纠纷',
      '助学贷款：还款起算点与展期',
      '求职骗局：收费内推、简历代投、面试收费',
    ],
  },
  {
    tag: '第三层 · 明确不做',
    tone: 'danger',
    items: [
      '法律咨询与维权代理：只提示风险，不承诺结果',
      '用户生成内容与社区：审核与担责成本扛不住',
      'App 与小程序：网页在手机上本来就能开',
      '付费墙：能查的东西就让你查',
    ],
  },
]

/** 数据口径：全站数字只认这几个来源 */
const dataRules = [
  { k: '规则', v: '63 条', d: '唯一真源是 db/rules.json，改数据只改它，再灌库；页面不手抄' },
  { k: '案例', v: '12 条', d: '全部脱敏改写，不出现公司全称、真实姓名，金额与时间模糊处理' },
  { k: '证书', v: '6 张', d: '只写可确认的报名机构与口径，日期一律标注「以官网当期公告为准」' },
  { k: '坑型', v: '8 类', d: '按规则 type 字段分组，一条规则只属于一类，各行相加等于 63' },
]
</script>

<template>
  <div class="wrap">
    <Reveal>
      <div class="mb-5">
        <span class="mb-2.5 inline-block rounded-full bg-brand-soft px-2.5 py-[3px] text-xs tracking-[0.14em] text-brand">关于</span>
        <h1 class="!mb-2 text-[26px]">关于「先查」</h1>
        <p class="mb-0 max-w-[760px] text-ink-2">
          我们不是什么大团队，就是两个在校学生。这个站最初是为了解决自己遇到的问题，后来发现身边的人也在重复踩同样的坑，才想着把它做出来。
        </p>
      </div>
    </Reveal>

    <Reveal :delay="40">
      <Card title="为什么要做这个">
        <p class="mb-2 text-sm text-ink-2">
          第一次签实习协议的时候，我们遇到的问题很具体：合同发来是一份 PDF，看着格式很正规，条款也看不太懂。问 HR，对方说「都是模板，大家都这么签」；问学长，学长说「我那份也差不多」。
        </p>
        <p class="mb-2 text-sm text-ink-2">
          后来才知道，同样的话术在不同的学校、不同的城市、不同的公司里被反复使用：先交押金、先交培训费、试岗不发工资、加班不给加班费、离职赔违约金。这些坑不难识别，难的是<b class="text-ink">第一次签的人根本不知道该看哪一段</b>。
        </p>
        <p class="mb-0 text-sm text-ink-2">
          所以我们把这个辨认过程整理成了可以复用的东西：一份规则库，一些真实的案例，一张能查的证书表。不指望它能替你谈判，只希望你在签字之前，能多问一句。
        </p>
      </Card>
    </Reveal>

    <Reveal :delay="80">
      <Card title="这是什么，不是什么" class="mt-4">
        <ul class="mb-0 pl-5 text-sm text-ink-2">
          <li><b class="text-ink">是</b>一个查询站：不用注册、不用装任何东西，打开浏览器就能用。</li>
          <li><b class="text-ink">是</b>一份提示清单：把常见的风险表述找出来，告诉你为什么、依据哪一条、可以怎么改。</li>
          <li><b class="text-ink">不是</b>法律意见：规则命中不等于合同无效，不命中也不等于合同安全。</li>
          <li><b class="text-ink">不是</b>律师替代品：涉及金额较大、已经签署、或者对方拒绝协商的，请找学校就业指导中心、当地劳动保障监察部门或 12333 咨询。</li>
        </ul>
      </Card>
    </Reveal>

    <Reveal :delay="120">
      <Card title="我们怎么处理你的合同" class="mt-4">
        <p class="mb-2 text-sm text-ink-2">
          <b class="text-ink">扫描只为了给出这份清单。</b>你粘贴的合同文本用于本次规则匹配，不用于训练、不对外分享；页面上不做任何统计埋点。
        </p>
        <p class="mb-2 text-sm text-ink-2">
          扫描之前，建议自己先把身份证号、手机号、统一社会信用代码、银行卡号替换成 ●●●●。这样做是为了让你在把清单发给朋友、老师看的时候，不至于连个人信息一起带出去。
        </p>
        <p class="mb-2 text-sm text-ink-2">
          <b class="text-ink">扫描历史只存四个数字。</b>时间、命中句数、命中规则数、风险分——原文不进历史记录。
          线上是纯静态站，这份记录存在你自己浏览器里（最多 30 条），换设备、换浏览器、清缓存都会看不到。
        </p>
        <p class="mb-0 text-sm text-ink-2">
          <b class="text-ink">不做的事：</b>不设账号体系、不做用户生成内容、不做付费墙。规则库与案例库都是公开可查的，任何人打开都能看到全部内容。
        </p>
      </Card>
    </Reveal>

    <Reveal :delay="160">
      <Card title="规则库是怎么来的" class="mt-4">
        <ul class="mb-0 list-none p-0">
          <li class="border-b border-dashed border-line py-2 text-sm text-ink-2 last:border-b-0">
            <b class="text-ink">法条</b>：以《劳动合同法》《劳动法》《社会保险法》《民法典》等现行法律的条文序号为依据。页面里只写条号，不复述条文原文，避免抄错。
          </li>
          <li class="border-b border-dashed border-line py-2 text-sm text-ink-2 last:border-b-0">
            <b class="text-ink">案例</b>：来自公开报道、高校就业指导材料与公开劳动争议案例，全部做了脱敏改写：不出现公司全称、不出现真实姓名、金额与时间做模糊处理。
          </li>
          <li class="border-b border-dashed border-line py-2 text-sm text-ink-2 last:border-b-0">
            <b class="text-ink">证书</b>：只写可确认的报名机构与口径。考试时间、报名时间、费用一律标注「以官网当期公告为准」，不预置具体日期——因为这类信息每年都在变，写死反而误导人。
          </li>
        </ul>
      </Card>
    </Reveal>

    <Reveal :delay="200">
      <Card title="数据口径：全站数字只认这几个来源" class="mt-4">
        <div class="overflow-x-auto rounded-[10px] border border-line">
        <table class="table-x min-w-[560px]">
          <caption>全站数字的口径与出处</caption>
          <thead>
            <tr>
              <th class="w-[90px] whitespace-nowrap">项目</th>
              <th class="w-[90px] whitespace-nowrap">现在</th>
              <th>口径</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="row in dataRules" :key="row.k">
              <td class="font-bold text-ink">{{ row.k }}</td>
              <td class="num font-bold text-brand">{{ row.v }}</td>
              <td class="text-ink-2">{{ row.d }}</td>
            </tr>
          </tbody>
        </table>
        </div>
        <p class="mb-0 mt-2.5 text-xs text-ink-3">
          数据唯一真源是 PostgreSQL 库 <code>xiancha</code> 的 <code>rule</code> / <code>trap</code> / <code>cert</code> 三张表。
          站点构建时由 <code>tools/db-export.mjs</code> 导出快照再预渲染进页面，数字与数据库行数逐条对得上——不会出现「线上一套数、本机一套数」。
        </p>
      </Card>
    </Reveal>

    <Reveal :delay="240">
      <Card title="三层规划：现在做什么、排队做什么、不做什么" class="mt-4">
        <div class="space-y-3">
          <div v-for="l in layers" :key="l.tag" class="rounded-[10px] border border-line bg-[#FBFCFE] p-3.5">
            <div class="mb-2 flex items-center gap-2">
              <span
                class="inline-block whitespace-nowrap rounded-full border px-2 text-[11px] font-bold leading-[18px]"
                :class="l.tone === 'ok'
                  ? 'border-[#CDE6D8] bg-ok-soft text-ok'
                  : l.tone === 'amber'
                    ? 'border-[#F0DDBC] bg-amber-soft text-amber'
                    : 'border-[#EFCFC9] bg-danger-soft text-danger'"
              >{{ l.tag }}</span>
            </div>
            <ul class="mb-0 pl-5 text-[13.5px] text-ink-2">
              <li v-for="it in l.items" :key="it">{{ it }}</li>
            </ul>
          </div>
        </div>
        <p class="mb-0 mt-3 text-xs text-ink-3">
          第二层的每一项都有准入线：有稳定数据来源、能写清依据、有人力维护，才放进「排队中」。达不到就先不做，宁可空着也不糊弄。
        </p>
      </Card>
    </Reveal>

    <Reveal :delay="280">
      <Card title="这个站的边界" class="mt-4">
        <p class="mb-2 text-sm text-ink-2">
          规则库目前 63 条，覆盖押金、培训贷、无薪试岗、违约金、社保、加班、合同文本、离职八个方向。它认的是<b class="text-ink">表述</b>，不是<b class="text-ink">事实</b>：
        </p>
        <ul class="mb-2 pl-5 text-sm text-ink-2">
          <li>同一句话在不同上下文里可能完全合法，所以要结合原句自己判断；</li>
          <li>有些坑不靠文字体现（比如口头承诺、实际执行与合同不符），规则扫不出来；</li>
          <li>各地的最低工资、社保比例、裁审口径有差异，具体以当地规定为准。</li>
        </ul>
        <p class="mb-0 text-sm text-ink-2">
          如果发现某条规则判定得不准，或者你有更典型的案例愿意提供（脱敏后即可），欢迎反馈。这个库是一点点长起来的，多一条真实的案例，就少一个人踩坑。
        </p>
      </Card>
    </Reveal>

    <Reveal :delay="320">
      <Card title="明确不做的事" class="mt-4">
        <ul class="mb-0 list-none p-0">
          <li class="border-b border-dashed border-line py-2 text-sm text-ink-2 last:border-b-0">
            <b class="text-ink">不做法律咨询、不做维权代理。</b>只提示「这里有风险」，不承诺结果、不代替律师。
          </li>
          <li class="border-b border-dashed border-line py-2 text-sm text-ink-2 last:border-b-0">
            <b class="text-ink">不做社区、投稿、评论区。</b>一旦有用户生成内容，就要审核、担责、处理投诉，这是我们扛不住的成本。
          </li>
          <li class="border-b border-dashed border-line py-2 text-sm text-ink-2 last:border-b-0">
            <b class="text-ink">不做 App、不做小程序。</b>网页在手机上本来就能开，多一个审核流程换不来任何体验提升。
          </li>
          <li class="border-b border-dashed border-line py-2 text-sm text-ink-2 last:border-b-0">
            <b class="text-ink">不做付费墙。</b>能查的东西就让你查，不收钱。以后如果活不下去，会先跟你说明白，而不是悄悄把话说一半。
          </li>
        </ul>
      </Card>
    </Reveal>

    <Reveal :delay="360">
      <Card title="技术上说几句" class="mt-4">
        <p class="mb-2 text-sm text-ink-2">
          前端 Nuxt 4 + Vue 3.5 + Tailwind CSS 4，构建时把规则、案例、证书、扫描统计预渲染进静态 HTML——所以线上这一版没有后端也能打开全部内容，
          手机流量差的时候也能秒开。
        </p>
        <p class="mb-2 text-sm text-ink-2">
          规则匹配有一个纯前端的实现，和本地全栈版的扫描引擎用同一份规则与同一套打分口径（高 14 分、中 7 分、低 3 分，封顶 100）。
          所以「后端通了」和「后端没通」两种情况下，同一份合同扫出来的分应该是一样的。
        </p>
        <p class="mb-0 text-sm text-ink-2">
          后端不可用时会自动降级到随包发布的同一份数据快照，页面只多一条提示条，不会白屏，内容口径一致。
        </p>
      </Card>
    </Reveal>

    <Reveal :delay="400">
      <Card title="致谢与说明" class="mt-4">
        <p class="mb-1.5 text-sm text-ink-2">
          站内的法条条号参考现行公开法律文本；案例为脱敏改写，不对应任何具体企业与个人；证书信息仅作检索入口，一切以官方网站当期公告为准。
        </p>
        <p class="mb-0 text-xs text-ink-3">本站不设账号体系，不做统计埋点。</p>
      </Card>
    </Reveal>

    <Reveal :delay="440">
      <div class="mt-4 flex flex-wrap items-center gap-2.5">
        <NuxtLink
          to="/scan"
          class="inline-flex h-[38px] items-center justify-center rounded-[9px] bg-brand px-4 text-sm font-bold text-white no-underline btn-x hover:bg-[#1A4368] hover:no-underline"
        >去扫描我的合同</NuxtLink>
        <NuxtLink
          to="/rules"
          class="inline-flex h-[38px] items-center justify-center rounded-[9px] border border-line bg-white px-4 text-sm text-ink-2 no-underline btn-x hover:border-[#C8D4E2] hover:bg-[#F7FAFD] hover:no-underline"
        >翻规则词条</NuxtLink>
        <NuxtLink
          to="/stats"
          class="inline-flex h-[38px] items-center justify-center rounded-[9px] border border-line bg-white px-4 text-sm text-ink-2 no-underline btn-x hover:border-[#C8D4E2] hover:bg-[#F7FAFD] hover:no-underline"
        >看数据总览</NuxtLink>
      </div>
    </Reveal>
  </div>
</template>
