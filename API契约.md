# 先查 · API 契约与数据模型（v2 重构）

前后端唯一约定文件。改接口先改这里。

## 技术栈（已定）

| 层 | 选型 | 版本 |
|---|---|---|
| 前端框架 | Vue | 3.5.45 |
| 建站框架 | Nuxt | 4.6.4（SPA 模式 + 可选 SSR 预渲染） |
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
  db/       数据导出源（rules.json / traps.json / certs.json），供 Flyway 种子导入
```

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
| POST | /api/scan | { text } → 扫描结果（服务端正则匹配） |

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
| / | 首页（搜索框 + 四张入口卡 + KPI + 三层结构） |
| /scan | 合同扫描 |
| /rules | 规则词条列表（筛选） |
| /rules/[id] | 词条详情 |
| /traps | 避坑案例库 |
| /certs | 考证日历 |
| /about | 关于 |

## 环境变量

web/.env → `NUXT_PUBLIC_API_BASE=http://127.0.0.1:8080/api`
