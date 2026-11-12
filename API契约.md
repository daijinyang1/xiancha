# 先查 · API 契约与数据模型（v2 重构）

前后端唯一约定文件。改接口先改这里。

## 技术栈（已定）

| 层 | 选型 | 版本 |
|---|---|---|
| 前端框架 | Vue | 3.5.45 |
| 建站框架 | Nuxt | 4.6.4（SSR + 静态预渲染，`nitro.preset='static'`） |
| 状态 | Pinia | 4.1.0 |
| 样式 | Tailwind CSS | 4.3.5（`@tailwindcss/vite` 插件，不用 postcss） |
| 构建 | Vite（Nuxt 内置） | — |
| 后端 | Spring Boot + Java | 3.x / JDK 21 |
| 数据库 | PostgreSQL | 18.1（本机 127.0.0.1:5432 / xiancha） |
| 迁移 | Flyway | — |

## 目录

```
先查项目/
  web/      Nuxt 前端（端口 3000）
  server/   Spring Boot 后端（端口 8080）
  db/       只有 README.md —— 数据真源是 PostgreSQL，本目录不再放 JSON
```

## 数据真源

**PostgreSQL 库 `xiancha` 是唯一真源。** 前端不存数据副本，构建期由
`tools/db-export.mjs` 从库里导出 `web/app/data/*.json` 快照供预渲染内联；
运行时（本机全栈）直接打后端 API 读库。

改数据的正确路径：连库改 → `node tools/db-export.mjs` → `--check` 验一致 → 提交推送。

## 数据模型

### rule（规则词条，63 条）
| 字段 | 类型 | 说明 |
|---|---|---|
| id | varchar(8) PK | R01…R63 |
| ask | varchar(120) | 学生真会问的那句话（页面 h1） |
| verdict | varchar(400) | 一句判定，带法条号 |
| name | varchar(200) | 规则名 |
| type | varchar(32) | 坑型（8 类） |
| level | varchar(4) | 高 / 中 / 低 |
| regex_source | text | 正则源码 |
| regex_flags | varchar(8) | 正则标志，通常空 |
| why | text | 为什么有风险 |
| law | text | 法律依据 |
| fix | text | 该怎么改 |

### trap（避坑案例，12 条）
id / title / type / level / scene / signals(text[]) / consequence / advice / source

### cert（考证，6 条）
id / name / level / fit / signup / exam / fee / official / note / signup_url / exam_date

### scan_log（扫描记录，可选）
id bigserial / created_at / text_hash / sentence_hits / rule_hits / score / ip_hash

## REST 接口（前缀 /api）

| 方法 | 路径 | 说明 |
|---|---|---|
| GET | /api/rules?type=&level=&q= | 规则列表（q 搜 ask/name/why/law） |
| GET | /api/rules/{id} | 单词条，含同坑型其他规则 id |
| GET | /api/traps?type= | 案例列表 |
| GET | /api/traps/{id} | 单案例，含同坑型规则链 |
| GET | /api/certs | 考证列表 |
| GET | /api/stats | { rules, traps, certs, byType, byLevel } |
| POST | /api/scan | { text } → 扫描结果（服务端正则匹配），**同时落 scan_log** |
| GET | /api/scan/history?limit=20 | 最近扫描记录（created_at DESC） |
| GET | /api/scan/stats | 扫描量汇总 + 近 7 天走势 |
| GET | /api/health | 服务与数据库探活 |

### GET /api/health 返回
```json
{ "status": "ok", "db": true, "rules": 63, "traps": 12, "certs": 6, "uptimeSec": 128, "version": "1.0.0" }
```

### GET /api/scan/history 返回
```json
[
  { "id": 21, "createdAt": "2026-11-12T12:31:02Z", "sentenceHits": 9, "ruleHits": 12, "score": 100, "level": "高" }
]
```
只含计数与分数，**不含原文**（`scan_log` 只存 `text_hash`）。

### GET /api/scan/stats 返回
```json
{
  "total": 21, "today": 5, "avgScore": 78,
  "highCount": 11, "midCount": 8, "lowCount": 2,
  "last7Days": [
    { "date": "2026-11-06", "count": 0, "avgScore": 0 },
    { "date": "2026-11-12", "count": 5, "avgScore": 82 }
  ]
}
```
`last7Days` 由 SQL `generate_series` 补齐 7 天（含 0 次的那天），前端不用自己补零。
分档口径与前端一致：`score >= 40` 高 / `score >= 15` 中 / 其余低。

### POST /api/scan 返回
```json
{
  "score": 100,
  "level": "high",
  "sentenceCount": 9,
  "ruleCount": 12,
  "hits": [
    {
      "sentence": "原句…",
      "start": 120,
      "end": 168,
      "level": "高",
      "rules": [ { "id": "R01", "ask": "...", "name": "...", "level": "高" } ]
    }
  ],
  "elapsedMs": 3
}
```

## 页面路由（Nuxt）

| 路径 | 页面 |
|---|---|
| / | 首页（品牌头 + 搜索框 + 入口卡 + KPI + 三层结构） |
| /scan | 合同扫描 |
| /rules | 规则词条列表（筛选） |
| /rules/[id] | 词条详情 |
| /traps | 避坑案例库 |
| /certs | 考证日历 |
| /history | 扫描历史（读 scan_log） |
| /stats | 数据总览（扫描量 + 坑型分布 + 风险分档） |
| /about | 关于 |
| /not-found | 404 兜底（构建时顶替 404.html） |

**导航层级：首页是入口，所有功能页都能从首页一屏点进去；页头常驻 6 项主导航。**

## 环境变量

web/.env → `NUXT_PUBLIC_API_BASE=http://127.0.0.1:8080/api`
