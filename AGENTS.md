# 先查项目 · 工作区指令

> 本目录是从 2026-11-07 起「先查」项目的**唯一工作位置**。以前在 `deepseek-harness/default-workspace/先查/`，现已整体迁到这里，旧位置已归档。

## 0. 身份
- 用户：**阳哥**。你自己：**大肥鱼**。说话直接，先给结论先给数。

## 1. 这是什么项目
第三届「金种子杯」大学生创业大赛参赛作品。赛道：人工智能与信息技术。学校：大专。团队 2 人（一人网站、一人收集数据）。**预算 0**。
- 一句话定位：「你手上这份合同，我告诉你哪几句话不能签」。
- 三层结构：第一层现在就能查（合同风险扫描 / 避坑案例库 / 规则词条 / 考证日历）；第二层排队中 5 项，有准入线；第三层明确不做（法律咨询、UGC、App、付费墙）。
- KPI 四格：63 条规则 / 12 条案例 / 6 个证书 / 0 处外部依赖（数字运行时从 `02_站点/js/data.js` 与 `js/traps.js` 读出，不写死）。

## 2. 目录
| 路径 | 是什么 |
|---|---|
| `01_方案/先查_主方案.docx` | 参赛主方案，**生成物**，改 `tools/_cfg_all.json` 后重渲染 |
| `02_站点/` | 纯静态站，双击 `index.html` 就能跑，无构建步骤 |
| `02_站点/js/traps.js` | **63 条规则的唯一真源**，字段顺序 id/ask/verdict/name/type/level/regex/why/law/fix |
| `02_站点/data/traps.json` | 12 条真实案例 |
| `02_站点/rules/R01..R63.html` | 63 个静态词条页，**生成物**，由 `tools/gen_rule_pages.mjs` 产出 |
| `02_站点/check.js` | 静态自检，83 文件 535900 字节 |
| `02_站点/404.html` `robots.txt` `sitemap.xml` `_headers` | 上线配套四件（sitemap 由脚本生成） |
| `tools/deploy.mjs` | 一条命令部署到 Cloudflare Pages（线上 https://xiancha.pages.dev） |
| `tools/live.mjs` | 部署后线上验收，真浏览器跑五页并存截图 |
| GitHub | 仓库 https://github.com/daijinyang1/xiancha（public，main），git 快照用，与部署解耦 |
| `03_素材/` | 竞品调研、素材清单、访谈模板、软著清单 |
| `tools/` | 生成与验收脚本 |

## 3. 常用命令（在项目根目录）
```bat
cd 02_站点 && node check.js                  :: 静态自检
node tools\gen_rule_pages.mjs               :: 重新生成 63 个词条页
node tools\e2e.mjs                          :: 真机验收 6 组 26 项（--show 开可见窗口）
python tools\build_docx.py tools\_cfg_all.json   :: 重新渲染主方案 docx
node tools\deploy.mjs                       :: 部署上线（先 check 与 e2e 都过）
node tools\live.mjs                         :: 部署后线上验收（真浏览器 + 截图）
```
- node：`C:/Users/21971/AppData/Local/nodejs/node.exe`（v26.13.0）
- python：`C:/Users/21971/.dsh/dsh-runtimes/dsh-primary-runtime/dependencies/python/python.exe`（3.12，有 python-docx / openpyxl / Pillow）
- 系统 python 是 WindowsApps 占位符，不可用。

## 4. 改东西的规矩
1. **改规则只改 `js/traps.js`**，然后跑 `gen_rule_pages.mjs` 重新生成词条页，再跑 `check.js` 和 `e2e.mjs`。不要手改 `rules/R*.html`，会被覆盖。
2. **方案 docx 是生成物**，改 `tools/_cfg_all.json`（或 `_cfg1/2/3.json` 再合并）后重渲染，不要手工改 docx 正文。
3. 全站**禁止外部资源**（不能引 CDN、字体、统计脚本）——断网也要能演示。
4. 数据不造假：页面上每个数字要么能对得上真源，要么标注「示例数据」。
5. 对外链接一律用干净地址（`/scan` 不是 `/scan.html`）：Pages 会把 `.html` 308 跳走，sitemap 里也必须是干净地址。
6. 文案不改口径不一致的数字：63 条规则 / 12 条案例 / 8 类坑型 / 6 个证书，全文必须一致。
7. 仓库是 public 的：明文密钥 / token / 密码一律不许提交，凭据只写「在哪个配置项读」。push 到 GitHub 不等于部署，部署仍走 `node tools/deploy.mjs`。

## 5. 自检清单（交付前必过）
- [ ] `cd 02_站点 && node check.js` → 无错误（83 文件约 536 KB，含上线配套 [4b] 节）
- [ ] `node tools/e2e.mjs` → 26 项全过
- [ ] 首页截图肉眼看过，四张入口卡都在
- [ ] 方案 docx 重新渲染过，段数/表数没变
- [ ] 部署后打开 https://xiancha.pages.dev 抽查首页、/scan、任意一条 /rules/Rxx，以及一个不存在的地址（要 404）
- [ ] 手机打开一次，确认不是只在本机能开

## 6. 当前状态（2026-11-08）
- **线上**：https://xiancha.pages.dev（Cloudflare Pages 免费套餐）。六个主页面 + 63 条词条 + 404 + robots + sitemap + _headers 全部已上线；404 兜底生效、sitemap 69 条全 200、缓存与安全头生效。
- 站点：83 文件 535900 字节，`check.js` 无错误，`e2e.mjs` 26/26 通过。
- 方案：`01_方案/先查_主方案.docx` 67728 B（5.4 已改成「已经上线」，站点结构表 24 行，自检清单 17 条）。
- 部署：`node tools/deploy.mjs` 一条命令；wrangler 4.158.0 在 `C:\Users\21971\.xiancha-deploy\`。
- 未做：`03_素材` 里的访谈与真实合同收集尚未执行（阳哥侧工作）；自定义域名未绑。