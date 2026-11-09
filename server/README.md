# 先查 · 后端服务（server）

Spring Boot 3.3.13 + Java 21 + PostgreSQL 18.1 + Flyway，端口 **8080**，对外 7 个接口。
规则 / 案例 / 证书的唯一数据真源是项目根 `db/` 下的三份 JSON，启动时由 Flyway 迁移脚本导入。

## 1. 启动方式

```powershell
$env:JAVA_HOME='D:\App\jdk21'
cd D:\Users\21971\Desktop\金种子杯\先查项目\server
& 'D:\App\maven\bin\mvn.cmd' spring-boot:run
```

首次启动 Flyway 会自动建表并灌数据（V1__schema.sql / V2__seed.sql），无需手动执行 SQL。
数据库：`jdbc:postgresql://127.0.0.1:5432/xiancha`，用户 `xiancha`。
日志同时输出到控制台与 `logs/xiancha-server.log`，全部 UTF-8。

## 2. 接口一览

| 方法 | 路径 | 说明 |
|---|---|---|
| GET | `/api/rules?type=&level=&q=` | 规则列表；q 搜 ask/name/why/law（也搜 id/verdict/fix） |
| GET | `/api/rules/{id}` | 单词条 + 同坑型其他规则 `siblings[]` / `relatedRules[]` |
| GET | `/api/traps?type=` | 案例列表 |
| GET | `/api/traps/{id}` | 单案例 + 同坑型规则链 `relatedRuleIds[]` / `ruleChain[]` |
| GET | `/api/certs` | 考证列表 |
| GET | `/api/stats` | `{rules, traps, certs, byType, byLevel, trapsByType}` |
| POST | `/api/scan` | `{text}` → 扫描结果（服务端正则匹配） |

数据库表：`rule`(63) / `trap`(12) / `cert`(6) / `scan_log`（扫描记录，只存 SHA-256 哈希与计数，不存原文）。

## 3. 实机验证结果

> 以下全部是 2026-11-08 19:10 本机 8080 端口真实启动后 `Invoke-RestMethod` 的原始返回。

### 3.0 启动日志（Flyway 迁移）

```
Database: jdbc:postgresql://127.0.0.1:5432/xiancha?currentSchema=public&characterEncoding=UTF-8 (PostgreSQL 18.1)
Successfully validated 2 migrations (execution time 00:00.014s)
Current version of schema "public": << Empty Schema >>
Migrating schema "public" to version "1 - schema"
Migrating schema "public" to version "2 - seed"
Successfully applied 2 migrations to schema "public", now at version v2 (execution time 00:00.039s)
Tomcat started on port 8080 (http) with context path '/'
Started XianchaApplication in 3.111 seconds
扫描引擎就绪：63 条规则已编译（共 63 条）
```

### 3.1 GET /api/stats

```json
{"rules":63,"traps":12,"certs":6,"byType":{"押金类":7,"培训贷":5,"无薪试岗":5,"违约金":7,"社保":6,"加班":7,"合同文本":16,"离职":10},"byLevel":{"高":37,"中":23,"低":3},"trapsByType":{"押金类":1,"培训贷":1,"无薪试岗":1,"违约金":2,"社保":1,"加班":1,"合同文本":3,"离职":2}}
```

- `rules = 63`、`traps = 12`、`certs = 6`，与契约一致。
- `byType` 8 类合计 63；`byLevel` 高 37 / 中 23 / 低 3，合计 63。

### 3.2 GET /api/rules

```
count = 63
```

首条（R01）原始返回：

```json
{"id":"R01","ask":"实习要交押金合法吗？","verdict":"不合法。《劳动合同法》第 9 条明确禁止用人单位要求劳动者提供担保或以其他名义收取财物。","name":"以押金／保证金名义收费","type":"押金类","level":"高","regexSource":"(?:缴纳|交纳|收取|支付|预交|一次性交)[^。；\\n]{0,12}(?:押金|保证金|风险金|抵押金)","regexFlags":"","why":"用人单位向劳动者收取押金、保证金，属于法律明确禁止的行为，交了也难要回，还容易被当成\"违约抵押\"。","law":"参见《劳动合同法》第 9 条：用人单位招用劳动者，不得扣押居民身份证和其他证件，不得要求劳动者提供担保或者以其他名义向劳动者收取财物。","fix":"删掉押金条款；已经交的，要求出具收据并全额退还，退还可作为继续谈的条件。"}
```

筛选参数实测：

| 请求 | 返回条数 |
|---|---|
| `/api/rules` | 63 |
| `/api/rules?type=押金类` | 7（R01–R07） |
| `/api/rules?level=高` | 37 |
| `/api/rules?q=押金` | 7 |

### 3.3 GET /api/rules/R01

规则本体全部平铺返回，另附两组同坑型信息（`siblings` 是 id 列表，`relatedRules` 带问句）：

```json
{
  "id": "R01",
  "ask": "实习要交押金合法吗？",
  "verdict": "不合法。《劳动合同法》第 9 条明确禁止用人单位要求劳动者提供担保或以其他名义收取财物。",
  "name": "以押金／保证金名义收费",
  "type": "押金类",
  "level": "高",
  "why": "用人单位向劳动者收取押金、保证金，属于法律明确禁止的行为，交了也难要回，还容易被当成\"违约抵押\"。",
  "law": "参见《劳动合同法》第 9 条：用人单位招用劳动者，不得扣押居民身份证和其他证件，不得要求劳动者提供担保或者以其他名义向劳动者收取财物。",
  "fix": "删掉押金条款；已经交的，要求出具收据并全额退还，退还可作为继续谈的条件。",
  "siblings": ["R02", "R03", "R04", "R05", "R06", "R07"],
  "relatedRules": [
    { "id": "R02", "ask": "实习押金说离职退，到期不给怎么办？", "name": "押金不予退还／抵扣工资", "level": "高", "type": "押金类" },
    { "id": "R03", "ask": "入职要押身份证原件，能给他吗？", "name": "扣押身份证／学生证等证件原件", "level": "高", "type": "押金类" },
    { "id": "R04", "ask": "上班第一天要交服装费和工牌费正常吗？", "name": "以服装费／工牌费／工装押金名义收费", "level": "中", "type": "押金类" },
    { "id": "R05", "ask": "公司指定医院让我自费体检，这钱该我出吗？", "name": "指定医院自费体检并指定项目", "level": "中", "type": "押金类" },
    { "id": "R06", "ask": "不用交押金，但要交「诚信金」，是一回事吗？", "name": "收取\"诚信金\"\"培训押金\"等变相费用", "level": "高", "type": "押金类" },
    { "id": "R07", "ask": "还没上班就先扣一笔违约金，合法吗？", "name": "以\"违约金\"名义先行扣款", "level": "高", "type": "押金类" }
  ]
}
```

### 3.4 GET /api/traps

```
count = 12
T01,T02,T03,T04,T05,T06,T07,T08,T09,T10,T11,T12
```

### 3.5 GET /api/traps/T01

```json
{
  "id": "T01",
  "title": "入职先交 800 元「服装押金」，离职时以「工装磨损」为由不退",
  "type": "押金类",
  "level": "高",
  "scene": "本地一家连锁餐饮门店招兼职服务员，面试当天就让交服装押金和工牌费，说「离职全额退」。干了两个月要走，店长说工装洗坏了，押金不退。",
  "signals": ["入职当天收现金、不给正规收据", "押金写「可退」但没有退还条件", "离职时单方面认定「工装损耗」"],
  "consequence": "800 元押金打水漂；因为没有收据、没有书面协议，投诉时连「交过钱」都难举证。",
  "advice": "不交任何名目的入职费用。已交的保留转账记录、微信聊天、收据原件，直接向当地劳动保障监察部门反映。",
  "source": "根据公开报道的餐饮兼职收费纠纷脱敏改写，公司名与人名已隐去。",
  "relatedRuleIds": ["R01", "R02", "R03", "R04", "R05", "R06", "R07"],
  "ruleChain": [ /* 7 条同坑型规则，字段同 relatedRules */ ]
}
```

### 3.6 GET /api/certs

```
count = 6
C01 教师资格证 | C02 全国计算机等级考试（二级） | C03 大学英语四六级（CET-4 / CET-6） | C04 普通话水平测试 | C05 初级会计职称 | C06 机动车驾驶证（C1 / C2）
```

首条（C01）原始返回：

```json
{"id":"C01","name":"教师资格证","level":"门槛中等","fit":"想进中小学、幼儿园、培训机构任教，或想给自己留一条「教育行业」的退路","signup":"笔试与面试分两次报名，一般每年上下半年各一次；具体日期以官网当期公告为准","exam":"笔试 → 面试 → 普通话水平测试 → 认定；各环节时间以官网当期公告为准","fee":"笔试、面试按科目收费，各省标准不同；以官网当期公告为准","official":"教育部教育考试院（中小学教师资格考试网）","note":"笔试单科成绩有效期 2 年，全部合格后才能报面试；认定还需要体检与普通话证书。","signupUrl":"","examDate":""}
```

### 3.7 POST /api/scan

请求体（5 句，含押金、违约金、社保、试用期工资、单方调岗）：

```json
{
  "text": "一、乙方入职前须一次性缴纳押金 800 元，离职时押金不予退还。\n二、试用期工资为正式工资的 60%，试用期为三个月。\n三、公司不为乙方缴纳社会保险，乙方自愿放弃社保。\n四、逾期未报到视为单方违约，须支付违约金 5000 元。\n五、甲方有权根据经营需要单方调整乙方岗位与薪资。"
}
```

实际返回（摘要行）：

```
score = 100 ; level = high ; sentenceCount = 5 ; ruleCount = 6 ; elapsedMs = 0
--- hits ---
[高] 一、乙方入职前须一次性缴纳押金 800 元，离职时押金不予退还。   << R01,R02
[高] 二、试用期工资为正式工资的 60%，试用期为三个月。   << R14
[高] 三、公司不为乙方缴纳社会保险，乙方自愿放弃社保。   << R26
[高] 四、逾期未报到视为单方违约，须支付违约金 5000 元。   << R20
[高] 五、甲方有权根据经营需要单方调整乙方岗位与薪资。   << R42
```

**结论：命中 5 句、6 条规则**（第 1 句被 R01 押金 + R02 押金不退同时命中，合并成一个 hit），
每句都是「高」风险，`5 × 3 × 10 = 150`，按 `min(100, …)` 封顶为 **100 分 → level=high**。

## 4. 扫描算法

1. **预编译缓存**：启动后首次扫描时把 63 条 `regex_source` 编译成 `Pattern`（`regex_flags` 非空时映射为 i/m/s/u 标志），常驻内存，之后的请求零编译开销。编译失败的规则只记 WARN 日志并跳过，不影响其他规则。
2. **逐条 find**：对输入文本用 `Matcher.find()` 循环匹配，每条规则最多记 500 次命中防炸内存；空匹配直接跳过。
3. **按句合并**：命中位置先向前后扩到分句符（`。！？` 与换行）为止（句末标点算进本句），再以 `(start,end)` 为键归并——同一句命中多条规则时合成一个 hit，`rules[]` 按等级从高到低、同等级按编号排序。
4. **打分**：每句取 `rules[0].level`（该句最高等级）的权重（高 3 / 中 2 / 低 1）乘 10 累加，`score = min(100, Σ)`。
5. **定级**：`score >= 70 → high`，`>= 40 → medium`，否则 `low`。
6. **落库**：每次扫描往 `scan_log` 写一行（SHA-256 哈希 + 命中句数 + 命中规则数 + 分数），**不存原文**；写日志失败只 WARN，不影响接口返回。

返回结构：

```json
{
  "score": 100,
  "level": "high",
  "sentenceCount": 5,
  "ruleCount": 6,
  "hits": [
    { "sentence": "原句…", "start": 0, "end": 40, "level": "高",
      "rules": [ { "id": "R01", "ask": "...", "name": "...", "level": "高" } ] }
  ],
  "elapsedMs": 0
}
```

`hits[]` 按句子等级从高到低、同等级按出现位置排序；`text.substring(start, end)` 恒等于 `sentence`。

## 5. 目录结构

```
server/
├─ pom.xml
├─ README.md
└─ src/main/
   ├─ java/com/xiancha/
   │  ├─ XianchaApplication.java
   │  ├─ config/WebConfig.java            CORS（允许 3000 与 pages.dev）
   │  ├─ controller/  Rule / Trap / Cert / Stats / Scan + ApiExceptionHandler
   │  ├─ dto/         RuleDetail / TrapDetail / ScanRequest / ScanHit / ScanResult / StatsResult
   │  ├─ entity/      Rule / Trap / Cert / ScanLog
   │  ├─ repository/  Rule / Trap / Cert / ScanLog Repository
   │  └─ service/     RuleService / TrapService / CertService / StatsService / ScanService / Constants
   └─ resources/
      ├─ application.yml
      └─ db/migration/
         ├─ V1__schema.sql   建 4 张表
         └─ V2__seed.sql     63 规则 + 12 案例 + 6 证书
```

## 6. 遗留问题 / 已知取舍

- 契约里 `scan_log.ip_hash` 是可选项，当前未建该列，也**不记录客户端 IP**（隐私优先，只存文本哈希）。
- 契约中 `/api/rules/{id}` / `/api/traps/{id}` 只写了「含同坑型其他规则 id」，实际同时给了 `siblings[]`（id 列表）和 `relatedRules[]`（带 ask/name/level），前端两种取法都能用。
- `/api/traps/{id}` 的 `ruleChain` 包含该坑型的**全部**规则（含与本案例直接对应的那条），不做 `excludeId` 过滤。
- `GET /api/rules/{id}` 与 `GET /api/traps/{id}` 找不到时返回 **404**（前端 `useApi` 会降级到内置 JSON 快照）。
- 扫描分句符用 `。！？` + 换行，不含 `；;`（旧静态站 `02_站点/js/scan.js` 多含分号，本任务按新口径）。
- 规则缓存是进程内 `volatile` 字段，改库后需重启（或调 `ScanService.reload()`）才生效；规则是静态数据，暂不需要热更新。
- 没有做鉴权、限流、分页：条目总量只有 63/12/6，全量返回比加接口更省事。

## 7. 快速自检

```powershell
Invoke-RestMethod 'http://127.0.0.1:8080/api/stats'
Invoke-RestMethod 'http://127.0.0.1:8080/api/rules/R01'
```

项目根还有一份全栈冒烟脚本：`node tools/smoke.mjs`（需后端 8080 + 前端 3000 同时在跑）。
