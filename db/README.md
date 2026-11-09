# db/ · 数据源（v2 重构）

从旧静态站 `02_站点` 导出的三份 JSON，作为新后端 Flyway 种子的唯一来源。

| 文件 | 条数 | 来源 |
|---|---|---|
| rules.json | 63 | `02_站点/js/traps.js` 的 `window.QZQ_TRAPS`（正则从 RegExp 拆成 regexSource + regexFlags 两个字段） |
| traps.json | 12 | `02_站点/data/traps.json` 原样 |
| certs.json | 6 | `02_站点/data/certs.json` 原样 |

## rules.json 字段

| 字段 | 说明 |
|---|---|
| id | R01…R63 |
| ask | 学生真会问的那句话（词条页 h1） |
| verdict | 一句判定，带法条号 |
| name | 规则名 |
| type | 坑型，8 类 |
| level | 高 / 中 / 低（高 37 / 中 23 / 低 3） |
| regexSource | 正则源码，不含斜杠 |
| regexFlags | 正则标志，当前全为空串 |
| why / law / fix | 为什么有风险 / 法律依据 / 该怎么改 |

## 坑型分布

押金类 7 / 培训贷 5 / 无薪试岗 5 / 违约金 7 / 社保 6 / 加班 7 / 合同文本 16 / 离职 10 = 63

## 导出方式（如需重新导出）

从 `02_站点/js/traps.js` 用 vm 跑一遍拿到 `window.QZQ_TRAPS`，把每条 `regex` 拆成 `regex.source` 与 `regex.flags`。别手抄，63 条正则抄错一条就会漏检。

## 注意

- 这份数据是**新后端的种子**，旧静态站仍在用自己的一份（`js/traps.js` 内联）。两边暂时并存。
- 中文必须 UTF-8 无 BOM。V2__seed.sql 里直接写中文字面量，不要转义成 \\uXXXX。
