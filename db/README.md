# db/ · 数据真源说明

> **2026-11-12 起：数据的唯一真源是 PostgreSQL 库 `xiancha`（表 `rule` / `trap` / `cert`），
> 本目录不再存放数据副本。**

## 数据流向

```
PostgreSQL (127.0.0.1:5432/xiancha)
    ├─ rule   63 行
    ├─ trap   12 行
    ├─ cert    6 行
    └─ scan_log  （浏览器每扫一次后端落一行）
        │
        │  node tools/db-export.mjs        ← 构建第 0 步，自动执行
        ↓
web/app/data/{rules,traps,certs}.json     ← 构建期快照（自动生成，随仓库提交）
        │
        │  npx nuxt generate
        ↓
web/.output/public/*.html                 ← 数据内联进静态 HTML
```

**为什么要快照**：线上是 Cloudflare Pages 纯静态站，构建环境里没有 Postgres，也没有 psql。
所以本地改完库必须先导一次快照再提交 —— 快照里永远只有「上次从库里导出的内容」，没有手改的余地。

## 常用命令

| 想做什么 | 命令 |
|---|---|
| 看库与快照是否一致 | `node tools/db-export.mjs --check`（不一致退出码 1） |
| 导出一份新快照 | `node tools/db-export.mjs` |
| 建库/重建数据 | 交给 Flyway：`V1__schema.sql` 建表 + `V2__seed.sql` 灌种子 |
| 连库看数据 | `PGPASSWORD=xiancha2026 D:/App/PostgreSQL/bin/psql.exe -h 127.0.0.1 -U xiancha -d xiancha` |

## 表结构

| 表 | 行数 | 说明 |
|---|---|---|
| `rule` | 63 | 合同风险规则。`regex_source` 是扫描引擎的正则源码（不含斜杠），`regex_flags` 是标志位 |
| `trap` | 12 | 脱敏改写过的真实套路案例，`signals` 是 text[] 信号清单 |
| `cert` | 6 | 证书信息（报名/考试/费用/官网） |
| `scan_log` | 每次扫描 +1 | 扫描行为日志：`text_hash`、`sentence_hits`、`rule_hits`、`score` |

`scan_log` 索引 `idx_scan_log_created` btree(created_at DESC)，供 `/api/scan/history` 与 `/api/scan/stats` 用。

## 坑型分布（rule.type，共 8 类）

押金类 7 / 培训贷 5 / 无薪试岗 5 / 违约金 7 / 社保 6 / 加班 7 / 合同文本 16 / 离职 10 = 63

## 注意

- 中文 UTF-8 无 BOM。`V2__seed.sql` 里直接写中文字面量，不要转义成 `\uXXXX`。
- 别再往本目录放 JSON。历史副本已在 2026-11-12 删除，需要的话从库里重新导。
- `02_站点/js/traps.js` 是旧静态站的内联数据，已退役，不要当成真源。
