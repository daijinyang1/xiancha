#!/usr/bin/env node
// 规则回归语料（2026-11-15 建立，配合 db/migrations/V3__rule_variants.sql）
//
// 用法：
//   node tools/rule-cases.mjs              # 用 functions/_lib/rules.generated.js（构建期快照）
//   node tools/rule-cases.mjs --from-db    # 直接从 PostgreSQL 读最新 regex_source
//
// 退出码：全部通过 0，有失败 1。
//
// 说明：改库后、还没跑 db-export.mjs + gen-functions-rules.mjs 之前，
// 生成物还是旧正则，两种模式结果会不同——这是正常的，不是脚本 bug。

import { spawnSync } from 'node:child_process'

const PSQL = process.env.PSQL_BIN || 'D:/App/PostgreSQL/bin/psql.exe'
const DB_ARGS = ['-h', '127.0.0.1', '-U', 'xiancha', '-d', 'xiancha', '-t', '-A', '-F', '\u0001']
const DB_ENV = {
  ...process.env,
  PGPASSWORD: process.env.DB_PASSWORD || 'xiancha2026',
  PGCLIENTENCODING: 'UTF8',
}

// 与 functions/_lib/scan.js 同口径：句末标点归本句
const SPLIT_RE = /(?<=[。！？\n\r])/

export function splitSentences(text) {
  return String(text)
    .split(SPLIT_RE)
    .map((s) => s.trim())
    .filter(Boolean)
}

// POSITIVE：应当命中至少一条 expect 里的规则
export const POSITIVE = [
  {
    "text": "试用期三个月不签劳动合同。",
    "expect": [
      "R17",
      "R38"
    ]
  },
  {
    "text": "入职要交 800 元服装押金。",
    "expect": [
      "R01",
      "R04"
    ]
  },
  {
    "text": "干不满一年没有年终奖。",
    "expect": [
      "R60"
    ]
  },
  {
    "text": "说好月薪 8000，合同上写面议。",
    "expect": [
      "R46"
    ]
  },
  {
    "text": "公司说不交社保，给补贴。",
    "expect": [
      "R25",
      "R26"
    ]
  },
  {
    "text": "离职要提前 120 天说。",
    "expect": [
      "R53"
    ]
  },
  {
    "text": "只签一份，公司留着。",
    "expect": [
      "R44"
    ]
  },
  {
    "text": "干得好可以转正，写不写无所谓。",
    "expect": [
      "R41"
    ]
  },
  {
    "text": "我们这行都这样，没有加班费。",
    "expect": [
      "R31"
    ]
  },
  {
    "text": "上班第一天先交押金 500。",
    "expect": [
      "R01"
    ]
  },
  {
    "text": "试用期要收服装费。",
    "expect": [
      "R04"
    ]
  },
  {
    "text": "工牌押金 100 元，离职退。",
    "expect": [
      "R04",
      "R01"
    ]
  },
  {
    "text": "公司要收保证金，说是怕你跑。",
    "expect": [
      "R01"
    ]
  },
  {
    "text": "交的押金离职不退。",
    "expect": [
      "R02"
    ]
  },
  {
    "text": "押金充抵最后一个月工资。",
    "expect": [
      "R02"
    ]
  },
  {
    "text": "身份证原件要交给人事保管。",
    "expect": [
      "R03"
    ]
  },
  {
    "text": "毕业证原件留在公司。",
    "expect": [
      "R03"
    ]
  },
  {
    "text": "要收诚信金两百块。",
    "expect": [
      "R06"
    ]
  },
  {
    "text": "入职要交培训押金。",
    "expect": [
      "R06",
      "R01"
    ]
  },
  {
    "text": "体检要自己去指定医院，费用自理。",
    "expect": [
      "R05"
    ]
  },
  {
    "text": "体检费自己掏，必须去他们指定的医院。",
    "expect": [
      "R05"
    ]
  },
  {
    "text": "服装费从工资里扣。",
    "expect": [
      "R07",
      "R04"
    ]
  },
  {
    "text": "违约金先从工资中扣除。",
    "expect": [
      "R07"
    ]
  },
  {
    "text": "培训费由学员自行承担。",
    "expect": [
      "R08"
    ]
  },
  {
    "text": "学费要自己出，上岗后退。",
    "expect": [
      "R08"
    ]
  },
  {
    "text": "先办个培训贷，工作后慢慢还。",
    "expect": [
      "R09"
    ]
  },
  {
    "text": "可以走教育分期。",
    "expect": [
      "R09"
    ]
  },
  {
    "text": "先学后付，包你上岗。",
    "expect": [
      "R09",
      "R10"
    ]
  },
  {
    "text": "先培训，培训合格后安排就业。",
    "expect": [
      "R10"
    ]
  },
  {
    "text": "培训完包分配。",
    "expect": [
      "R10"
    ]
  },
  {
    "text": "中途退出培训费要双倍赔偿。",
    "expect": [
      "R11"
    ]
  },
  {
    "text": "培训费从工资里扣。",
    "expect": [
      "R12"
    ]
  },
  {
    "text": "试岗三天没有工资。",
    "expect": [
      "R13"
    ]
  },
  {
    "text": "考察期白干，不给钱。",
    "expect": [
      "R13"
    ]
  },
  {
    "text": "无薪试岗一周，看能力。",
    "expect": [
      "R13"
    ]
  },
  {
    "text": "试用期工资按正式工资的 60% 发。",
    "expect": [
      "R14"
    ]
  },
  {
    "text": "见习期工资打五折。",
    "expect": [
      "R14"
    ]
  },
  {
    "text": "试用期六个月，试用期满再谈。",
    "expect": [
      "R15"
    ]
  },
  {
    "text": "试用期一年。",
    "expect": [
      "R15"
    ]
  },
  {
    "text": "培训期不计入工作时间。",
    "expect": [
      "R16"
    ]
  },
  {
    "text": "转正之后再签合同。",
    "expect": [
      "R17"
    ]
  },
  {
    "text": "考核合格才签劳动合同。",
    "expect": [
      "R17"
    ]
  },
  {
    "text": "三方协议约定违约金两万。",
    "expect": [
      "R18"
    ]
  },
  {
    "text": "服务期三年，违约金一次性全额赔。",
    "expect": [
      "R19"
    ]
  },
  {
    "text": "违约金 50000 元。",
    "expect": [
      "R20"
    ]
  },
  {
    "text": "提前离职视为违约，要赔钱。",
    "expect": [
      "R21"
    ]
  },
  {
    "text": "跳槽算违约。",
    "expect": [
      "R21"
    ]
  },
  {
    "text": "竞业限制三年，没有补偿。",
    "expect": [
      "R22"
    ]
  },
  {
    "text": "保密义务永久有效。",
    "expect": [
      "R23"
    ]
  },
  {
    "text": "协议上手写补充条款。",
    "expect": [
      "R24"
    ]
  },
  {
    "text": "实习期间不缴社保。",
    "expect": [
      "R25"
    ]
  },
  {
    "text": "转正前不给上五险。",
    "expect": [
      "R25"
    ]
  },
  {
    "text": "自愿放弃社保，签个字就行。",
    "expect": [
      "R26"
    ]
  },
  {
    "text": "社保自己缴，公司不管。",
    "expect": [
      "R27"
    ]
  },
  {
    "text": "五险从工资里扣，全部你自己出。",
    "expect": [
      "R27"
    ]
  },
  {
    "text": "工伤自己负责，跟公司没关系。",
    "expect": [
      "R28"
    ]
  },
  {
    "text": "按实习名义走，不建立劳动关系。",
    "expect": [
      "R29"
    ]
  },
  {
    "text": "社保按最低基数申报。",
    "expect": [
      "R30"
    ]
  },
  {
    "text": "加班不给加班费。",
    "expect": [
      "R31"
    ]
  },
  {
    "text": "加班费包含在月薪里。",
    "expect": [
      "R31"
    ]
  },
  {
    "text": "超时工作白干，义务加班。",
    "expect": [
      "R31"
    ]
  },
  {
    "text": "每月加班 60 小时。",
    "expect": [
      "R32"
    ]
  },
  {
    "text": "不加班按旷工处理。",
    "expect": [
      "R33"
    ]
  },
  {
    "text": "法定节假日加班只给调休，不再支付加班费。",
    "expect": [
      "R34"
    ]
  },
  {
    "text": "值班不算加班。",
    "expect": [
      "R35"
    ]
  },
  {
    "text": "未经审批的不算加班。",
    "expect": [
      "R36"
    ]
  },
  {
    "text": "试用期没有加班费。",
    "expect": [
      "R37"
    ]
  },
  {
    "text": "我们只口头约定，不签合同。",
    "expect": [
      "R38"
    ]
  },
  {
    "text": "不签书面协议，先说好用。",
    "expect": [
      "R38"
    ]
  },
  {
    "text": "空白合同先签字，回头再填。",
    "expect": [
      "R39"
    ]
  },
  {
    "text": "签订实习协议，不缴纳社保。",
    "expect": [
      "R40"
    ]
  },
  {
    "text": "口头承诺转正，不写进合同。",
    "expect": [
      "R41"
    ]
  },
  {
    "text": "公司有权随时调整岗位。",
    "expect": [
      "R42"
    ]
  },
  {
    "text": "一边实习一边又是全职。",
    "expect": [
      "R43"
    ]
  },
  {
    "text": "合同一式一份，由公司保存。",
    "expect": [
      "R44"
    ]
  },
  {
    "text": "最终解释权归公司。",
    "expect": [
      "R45"
    ]
  },
  {
    "text": "工资面议，另行约定。",
    "expect": [
      "R46"
    ]
  },
  {
    "text": "公司可随时解除合同，无需补偿。",
    "expect": [
      "R47"
    ]
  },
  {
    "text": "无需盖章，签字就生效。",
    "expect": [
      "R48"
    ]
  },
  {
    "text": "争议提交异地仲裁委员会仲裁。",
    "expect": [
      "R49"
    ]
  },
  {
    "text": "放弃仲裁权利。",
    "expect": [
      "R50"
    ]
  },
  {
    "text": "合同期三个月，试用期两个月。",
    "expect": [
      "R51"
    ]
  },
  {
    "text": "工资用微信转账发放。",
    "expect": [
      "R52"
    ]
  },
  {
    "text": "作品著作权归公司所有。",
    "expect": [
      "R63"
    ]
  },
  {
    "text": "离职要提前 90 天。",
    "expect": [
      "R53"
    ]
  },
  {
    "text": "实习证明不予出具。",
    "expect": [
      "R54"
    ]
  },
  {
    "text": "离职扣发当月工资。",
    "expect": [
      "R55"
    ]
  },
  {
    "text": "离职要缴培养费。",
    "expect": [
      "R56"
    ]
  },
  {
    "text": "不办理交接视为放弃工资。",
    "expect": [
      "R57"
    ]
  },
  {
    "text": "离职证明不给开，档案留在公司。",
    "expect": [
      "R58"
    ]
  },
  {
    "text": "试用期离职要赔违约金。",
    "expect": [
      "R59"
    ]
  },
  {
    "text": "没干满一年不发年终奖。",
    "expect": [
      "R60"
    ]
  },
  {
    "text": "自动离职按旷工处理。",
    "expect": [
      "R61"
    ]
  },
  {
    "text": "考核不合格可以随时终止。",
    "expect": [
      "R62"
    ]
  }
]

// NEGATION_COMPLIANT：合同里极常见的「我们不做坏事」声明。
// 这些句子含「不收取押金」「不扣押证件」等字样，规则正则会命中，必须靠**否定语境守护**压掉。
// 只在默认模式（走 functions/_lib/scan.js 真引擎）校验；--from-db 是纯正则模式，跳过。
export const NEGATION_COMPLIANT = [
  '公司不收取任何押金。',
  '用人单位不得以任何名义向劳动者收取押金。',
  '本公司承诺不向员工收取押金或保证金。',
  '入职无需缴纳押金。',
  '公司不要求员工交服装费。',
  '不扣押员工身份证原件。',
  '公司不会扣押员工任何证件。',
  '我们不收培训费。',
  '入职不收取任何费用。',
  '公司不强制员工加班。',
  '不会拖欠工资。',
  '不要求员工自费体检。',
  '公司不扣留毕业证。',
  '不需要交诚意金。',
]

// NEGATION_MIXED：否定与违规并存，必须**只报违规那一半**。
// 逗号处断从句是关键 —— 按句号断会把违规那半一起压掉。
export const NEGATION_MIXED = [
  { text: '公司不收取押金，但要交 800 元服装费。', expect: ['R04'] },
  { text: '我们不收押金，不过要扣押身份证原件。', expect: ['R03'] },
  { text: '公司不收取押金，不过要扣押身份证原件。', expect: ['R03'] },
  { text: '入职不需要押金，但试用期三个月不签合同。', expect: ['R17', 'R38'] },
  { text: '不收取任何费用，也不签劳动合同。', expect: ['R38'] },
  { text: '不但不缴社保，还说试用期没有。', expect: ['R25'] },
]

// NEGATIVE：合规句 + 与陷阱无关的中性句，必须零命中
export const NEGATIVE = [
  "公司依法为员工缴纳五险一金。",
  "试用期三个月，工资按正式工资的 100% 发放。",
  "加班按国家标准支付 1.5 倍加班费。",
  "劳动合同一式两份，双方各持一份。",
  "离职提前 30 天书面通知公司即可。",
  "公司每月 15 日通过银行转账发放工资。",
  "试用期包含在劳动合同期限内。",
  "入职当天签订书面劳动合同。",
  "公司为员工购买了工伤保险。",
  "年终奖根据年度考核结果发放。",
  "公司提供免费岗前培训，不收取任何费用。",
  "合同期满双方协商一致可以续签。",
  "公司代扣代缴个人所得税。",
  "试用期满经考核合格转为正式员工。",
  "公司为员工缴纳住房公积金。",
  "加班需提前申请，经批准后方可加班。",
  "工资于次月 10 日前通过银行转账发放。",
  "公司提供劳动保护用品。",
  "离职时公司出具离职证明并办理档案转移。",
  "公司按照劳动合同约定支付劳动报酬。",
  "试用期工资不低于本单位相同岗位最低档工资。",
  "劳动合同期满，经双方协商同意可以续订。",
  "本人身体健康，无不良嗜好。",
  "岗位职责为门店日常运营与客户接待。",
  "工作时间为上午九点至下午六点。",
  "公司提供住宿与工作餐。",
  "员工应遵守公司各项规章制度。",
  "本人承诺所提供的信息真实有效。",
  "双方本着平等自愿、协商一致的原则签订本协议。",
  "乙方应服从甲方的工作安排。",
  "甲方为乙方提供必要的劳动条件。",
  "本协议自双方签字之日起生效。",
  "试用期满后，甲方将根据乙方表现决定是否留用。",
  "乙方因个人原因需要请假的，应提前申请。",
  "员工享有国家规定的法定节假日。",
  "公司地址位于株洲市天元区。",
  "乙方离职时应当妥善保管公司财物。",
  "公司定期组织员工培训与团建活动。",
  "本人已阅读并理解上述条款。",
  "工作地点由公司统一安排。",
  "乙方应保守甲方的商业秘密。",
  "岗位要求大专以上学历，专业不限。"
]

async function loadRules(fromDb) {
  if (!fromDb) {
    const mod = await import('../functions/_lib/rules.generated.js')
    return mod.RULES
  }
  const r = spawnSync(
    PSQL,
    [...DB_ARGS, '-c', 'select id, regex_source, regex_flags from rule order by id'],
    { env: DB_ENV, encoding: 'utf8', maxBuffer: 32 * 1024 * 1024 }
  )
  if (r.status !== 0) {
    console.error('读库失败：' + (r.stderr || ''))
    process.exit(2)
  }
  // 注意：psql 经 MSYS 输出是 CRLF，必须去掉行尾 \r
  return r.stdout
    .split('\n')
    .map((l) => l.replace(/\r$/, ''))
    .filter((l) => l.length)
    .map((l) => {
      // 用 \u0001 分隔：regex_source 里本身含 | 和 \n，不能用 | 当分隔符
      const [id, regexSource, regexFlags] = l.split('\u0001')
      return { id, regexSource: regexSource || '', regexFlags: regexFlags || '' }
    })
}

const JS_FLAG_MAP = { i: 'i', m: 'm', s: 's', u: 'u' }

function compile(rules) {
  const out = []
  const bad = []
  for (const r of rules) {
    const flags = [...String(r.regexFlags || '')]
      .filter((f) => JS_FLAG_MAP[f])
      .map((f) => JS_FLAG_MAP[f])
      .join('')
    try {
      out.push({ id: r.id, re: new RegExp(r.regexSource, flags + 'g') })
    } catch (e) {
      bad.push({ id: r.id, msg: e.message })
    }
  }
  return { out, bad }
}

function hitIds(compiled, text) {
  const hit = new Set()
  for (const sent of splitSentences(text)) {
    for (const { id, re } of compiled) {
      re.lastIndex = 0
      if (re.test(sent)) hit.add(id)
    }
  }
  return [...hit].sort()
}

async function main() {
  const fromDb = process.argv.includes('--from-db')
  // --check：只做纯正则校验（跳过依赖真引擎的否定语境守护那两组）
  const checkOnly = process.argv.includes('--check')
  const rules = await loadRules(fromDb)
  const { out: compiled, bad } = compile(rules)

  console.log(`== 规则来源：${fromDb ? 'PostgreSQL rule 表' : 'functions/_lib/rules.generated.js'} ==`)
  console.log(`== 规则 ${rules.length} 条，成功编译 ${compiled.length} 条，编译失败 ${bad.length} 条 ==`)
  for (const b of bad) console.log(`  编译失败 ${b.id}: ${b.msg}`)

  let pass = 0
  let fail = 0
  const failures = []

  for (const c of POSITIVE) {
    const got = hitIds(compiled, c.text)
    const ok = c.expect.some((e) => got.includes(e))
    if (ok) pass++
    else {
      fail++
      failures.push(`FAIL  ${c.text}\n        期望 ${c.expect.join('/')}，实得 [${got.join(',') || '无'}]`)
    }
  }
  for (const t of NEGATIVE) {
    const got = hitIds(compiled, t)
    if (got.length === 0) pass++
    else {
      fail++
      failures.push(`FAIL  ${t}\n        应零命中，实得 [${got.join(',')}]`)
    }
  }

  // 否定语境守护：这两组必须走真引擎（functions/_lib/scan.js），纯正则模式测不出守护
  if (!fromDb && !checkOnly) {
    const { scanText } = await import('../functions/_lib/scan.js')
    const engineIds = (s) => [...new Set((scanText(s).hits || []).flatMap((h) => (h.rules || []).map((r) => r.id)))].sort()
    for (const t of NEGATION_COMPLIANT) {
      const got = engineIds(t)
      if (got.length === 0) pass++
      else {
        fail++
        failures.push(`FAIL  ${t}\n        否定声明应零命中，实得 [${got.join(',')}]（否定语境守护失效？）`)
      }
    }
    for (const c of NEGATION_MIXED) {
      const got = engineIds(c.text)
      const missing = c.expect.filter((e) => !got.includes(e))
      if (missing.length === 0) pass++
      else {
        fail++
        failures.push(`FAIL  ${c.text}\n        混合句缺 ${missing.join('/')}，实得 [${got.join(',') || '无'}]（从句切分太宽？）`)
      }
    }
  }

  if (failures.length) {
    console.log('')
    for (const f of failures) console.log(f)
    console.log('')
  }

  const total = POSITIVE.length + NEGATIVE.length
  const extra = fromDb || checkOnly ? 0 : NEGATION_COMPLIANT.length + NEGATION_MIXED.length
  console.log(`positive ${POSITIVE.length} 条 / negative ${NEGATIVE.length} 条，合计 ${total} 条`)
  if (extra) console.log(`否定语境守护 ${NEGATION_COMPLIANT.length} 条合规声明 + ${NEGATION_MIXED.length} 条混合句，共 ${extra} 条`)
  console.log(`通过 ${pass} / 失败 ${fail}`)
  process.exit(fail === 0 ? 0 : 1)
}

main().catch((e) => {
  console.error(e)
  process.exit(2)
})
