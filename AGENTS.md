# 先查项目 · 工作区指令

> 本目录是「先查」项目的**唯一工作位置**（2026-11-07 起）。旧位置 `deepseek-harness/default-workspace/先查/` 已归档。

## 0. 身份
- 用户：**阳哥**。你自己：**大肥鱼**。说话直接，先给结论先给数。

## 1. 这是什么项目
第三届「金种子杯」大学生创业大赛参赛作品。赛道：人工智能与信息技术。学校：大专。团队 2 人（一人网站、一人收集数据）。**预算 0**。
- 一句话定位：「你手上这份合同，我告诉你哪几句话不能签」。
- 三层结构：第一层现在就能查（合同风险扫描 / 避坑案例库 / 规则词条 / 考证日历）；第二层排队中 5 项，有准入线；第三层明确不做（法律咨询、UGC、App、付费墙）。
- KPI 四格：63 条规则 / 12 条案例 / 6 个证书 / 8 类坑型（数字运行时从后端 `/api/stats` 读，不写死）。

## 2. 技术栈（2026-11-08 整体重写）
| 层 | 选型 |
|---|---|
| 前端 | Nuxt 4.6.4 + Vue 3.5.45 + Pinia 4.1.0，SPA（`ssr:false`），端口 3000 |
| 样式 | Tailwind CSS 4.3.5（`@tailwindcss/vite`），深蓝 #1F4E79 + 红 #C0392B |
| 后端 | Spring Boot 3.3.13 + JDK 21 + Maven，端口 8080，包名 `com.xiancha` |
| 数据库 | PostgreSQL 18.1 + Flyway（`127.0.0.1:5432`，库/用户/口令都叫 `xiancha`） |

## 3. 目录
| 路径 | 是什么 |
|---|---|
| `启动.bat` / `停止.bat` | 一键起停：PostgreSQL → 后端 :8080 → 前端 :3000 → 自动开浏览器 |
| `API契约.md` | 前后端**唯一契约**：10 个接口的路径、入参、返回结构。改接口先改这里 |
| `db/README.md` | 数据真源说明。**数据本身在 PostgreSQL**，本目录不再放 JSON 副本 |
| `server/` | Spring Boot 后端；`src/main/java/com/xiancha/{controller,service,entity,repository,dto}` |
| `server/src/main/resources/db/migration/` | `V1__schema.sql` 建表、`V2__seed.sql` 灌数据、`V3__rule_variants.sql` 规则正则变体（2026-11-15）。**Flyway 只扫这个目录**，`db/migrations/` 下的是 D1 的 SQL，别放混 |
| `server/src/main/java/com/xiancha/service/ScanService.java` | 扫描引擎：切句 → 正则匹配 → 同句合并 → 打分排序 → 落扫描日志 |
| `web/app/pages/` | 9 个页面：`/` `/scan` `/rules` `/rules/[id]` `/traps` `/certs` `/about` `/history` `/stats` |
| `web/app/composables/useApi.ts` | 唯一后端访问层：9 个取数方法 + 2500ms 超时 + 降级兜底；`base` 浏览器里是 `/api`、预渲染期是 `''` |
| `web/app/composables/useSeo.ts` | 每页 head：绝对 canonical / og / twitter / JSON-LD |
| `web/app/components/` | 页头/页脚/卡片/徽章/Toast/图标 + `Reveal` `CountUp` `ProgressRing` `ModeToggle` `ScrollProgress` `OdometerNumber` `LineReveal` `TabsRail` `BlurReveal` |
| `web/app/assets/css/motion.css` | 9 个克制动效（纯 CSS + IntersectionObserver，零动画库） |
| `functions/` | **线上后端**（Cloudflare Pages Functions）：`api/**` 11 个端点 + `_lib/{http,scan,db,catalog}.js` |
| `functions/_lib/scan.js` | 线上扫描引擎，按 `ScanService.java` 逐行复刻，**两边必须同步改** |
| `wrangler.toml` | Pages 项目配置：D1 binding `DB` → `xiancha-scan`；不含 account_id、不含密钥 |
| `db/migrations/d1/V1__d1_scan_log.sql` | 线上 D1 建表（`scan_log` + `idx_scan_log_created`） |
| `web/app/data/*.json` | **构建期快照**，由 `tools/db-export.mjs` 从数据库导出，**不许手改** |
| `tools/db-export.mjs` | 库 → 快照导出（构建第 0 步）；`--check` 比对库与快照是否一致 |
| `tools/verify-stack.mjs` | 全栈自检：数据库 → 后端接口 → 扫描落库 → 前后端字段对齐 |
| `02_站点/` | 第一版纯静态站（无后端）。**2026-11-11 起线上不再跑它**，产物改由 `web/` 预渲染；目录保留做断网兜底 |
| `01_方案/先查_主方案.docx` | 参赛主方案，**生成物**，改 `tools/_cfg_all.json` 后重渲染 |
| `03_素材/` | 同类站点调研、素材清单、访谈模板、软著清单 |
| `tools/` | 验收与生成脚本（smoke / cdp_web / cdp_func / build_docx / deploy / live） |

## 4. 常用命令（在项目根目录）
```bat
启动.bat                                  :: 起全栈
停止.bat                                  :: 停 8080 与 3000
node tools\smoke.mjs                       :: 端到端 44 项（7 接口 + 扫描口径 + 7 路由 + 真浏览器）
node tools\cdp_web.mjs                     :: 7 路由截图到 tools/_shots/
node tools\cdp_func.mjs                    :: 交互验收 5 组（扫描/筛选/展开/倒计时）
node tools\ci-check.mjs                    :: 10 项回归门禁（GitHub Actions 跑的就是它）
node tools\seo-check.mjs .out              :: 8 组 SEO/分享断言
node tools\verify-stack.mjs                :: 20 项全栈联调（需 Postgres + jar）
node tools\gen-functions-rules.mjs --check :: 线上规则生成物是否与快照一致
node tools\bind-d1.mjs                     :: 写 Pages 的 D1 binding（对象不是数组）
python tools\build_docx.py tools\_cfg_all.json   :: 重新渲染方案 docx
python tools\verify_docx.py                       :: 核对 179 段/28 表/19968 字 + 扫旧口径
```
- node：`C:/Users/21971/AppData/Local/nodejs/node.exe`（v26.13.0）
- python：`C:/Users/21971/.dsh/dsh-runtimes/dsh-primary-runtime/dependencies/python/python.exe`（3.12，有 python-docx / openpyxl / Pillow）；系统 python 是 WindowsApps 占位符，不可用。
- maven：`D:\App\maven\bin\mvn.cmd`，本地仓库 `D:\App\maven-repo`；JDK 21 在 `D:\App\jdk21`。

## 5. 改东西的规矩
1. **改数据只改数据库**：连 PostgreSQL 改 `rule`/`trap`/`cert` 表 → `node tools/db-export.mjs` 导快照 → `node tools/db-export.mjs --check` 验一致。要让改动可复现就新建 `V4__xxx.sql` 写增量（**不要改已跑过的 V1/V2/V3**，Flyway 有校验和，改了启动必失败）。改完规则还要 `node tools/gen-functions-rules.mjs` 重生成线上数据、`node tools/rule-cases.mjs --from-db` 跑 136 条回归。**没有 `db/*.json` 了，别再找。**
2. **方案 docx 是生成物**：改 `tools/_cfg_all.json`（或 `_cfg1/2/3.json` 后按序拼回），再 `python tools/build_docx.py tools/_cfg_all.json`。禁止手工改 docx 正文。
   拼接关系：`_cfg_all.blocks = _cfg1.blocks(48) + _cfg2(59) + _cfg3(69) = 176`，`_cfg2/_cfg3` 是纯数组，无外壳。
3. **页面只通过 `useApi.ts` 取数**，不许在页面里直接 import `app/data/*.json`（那是兜底专用的）。
4. **降级必须留着**：任何新的取数逻辑都要接进 `useApi` 的统一 catch，后端挂了页面只能多一条黄条，不能白屏或抛错。
5. 对外链接一律用干净地址（`/scan` 不是 `/scan.html`）：Cloudflare Pages 会把 `.html` 308 跳走。
6. 文案数字全站一致：63 条规则 / 12 条案例 / 8 类坑型 / 6 个证书。
7. 仓库 public：密钥、token、密码一律不进仓库（数据库口令只是本机开发口令，不进任何文档截图）。
8. **`nuxt dev` 必须带 `--host 127.0.0.1`**（默认只听 `::1`，用 127 打开会报「服务器不可用」）。
9. **线上后端改了规则数据**：`node tools/gen-functions-rules.mjs` 重生成 `functions/_lib/*.generated.js`，再 `--check` 验三份一致。规则不许在 functions 里手抄。
10. **level 口径全站唯一 = 40 / 15**：`POST /api/scan` 返 `high|mid|low`，`/api/scan/history` 返中文 `高|中|低`（前端只认中文）。不要出现 `medium`。
11. **深色模式不写 `dark:` 前缀类**：只覆盖 `[data-mode="dark"]` 里的 `--color-*` 令牌，否则 10 个页面必漏。新增颜色请先加成令牌。
12. **动效时长纪律**：交互类 ≤200ms（`--duration-quick` 120 / `--duration-base` 180），入场类 360/620ms。任何 >700ms 的动画算 bug（`ci-check.mjs` 第 10 项会拦）。
13. **深色切换走 View Transitions**：`web/app/composables/useTheme.ts` 是唯一出口。有 `document.startViewTransition` 时**只走圆形揭示**（从开关中心 `getBoundingClientRect()` 算半径，320ms），**不再挂** `.theme-transitioning`（两层同时开会给全站 3500 个过渡，/rules 累计阻塞 435ms）。UA 默认交叉淡入必须用 `animation: none` 关掉，否则圆内还在淡入、等于两层叠加。
14. **规则正则必须双端可编译**：同一份 `regex_source` 要同时被 Java `Pattern` 与 JS `RegExp` 编译（禁 `\p{..}`、`\Q..\E`、possessive `a++`、命名组），窗口 ≤`{0,30}`、单条 ≤300 字符。改完跑 `node tools/rule-cases.mjs --from-db`（136 条必须 136/0）。

## 6. 自检清单（交付前必过）
- [ ] `node tools/ci-check.mjs` → 10 项全过（GitHub Actions 同款，本地先过再推）
- [ ] `node tools/seo-check.mjs .out` → 8 组全过
- [ ] `node tools/verify-stack.mjs` → 20 项全过（需 Postgres + jar，验的是「真连数据库」不是快照）
- [ ] `node tools/rule-cases.mjs --from-db` → 136/0（改了任何 `regex_source` 才需要，但改了不跑等于没验）
- [ ] 深色切换真看过一遍：圆形揭示从开关那里扩散，不是整页瞬间变色，也没有 250ms 的交叉淡入叠在上面
- [ ] `grep -rl "后端未连接" .out --include=*.html` 与 `grep -rl "127.0.0.1:8080" .out --include=*.html` 都必须是 0
- [ ] `node tools/smoke.mjs` → 44 项全过（需三端口齐）
- [ ] 关掉后端刷新一次 → 只多一条「后端未连接」，不白屏、扫描仍出结果
- [ ] 手机打开一次，确认不是只在本机能开
- [ ] 深色模式下逐页扫一遍：正文、表格、卡片、徽章、Toast 都不能出现白底黑字打架
- [ ] 方案 docx 重新渲染过，`python tools/verify_docx.py` 无旧口径残留（当前 179 段 / 28 表 / 19968 字）

## 7. 当前状态（2026-11-15）

- **本机全栈**：`启动.bat` 三端口齐（5432 PostgreSQL / 8080 后端 / 3000 前端）时，`smoke.mjs` 44/44。
- **线上 = Nuxt 预渲染 + Pages Functions 后端**：https://xiancha.pages.dev
  - Pages 项目 `xiancha`，源 `daijinyang1/xiancha@main`，**构建命令 `node tools/build-site.mjs .out`**，输出目录 `.out`，根目录留空。
  - push 后 40～90 秒自动上线；产出口径 **176 文件 / 71 条 sitemap URL**（9 个页面 + 63 词条 + 404 + robots + `_headers` + manifest + 4 张图标）。
  - 输出形态是**扁平 `xxx.html`**（`nitro.prerender.autoSubfolderIndex: false`）。目录式输出会让 Pages 把 `/scan` 308 跳到 `/scan/`。
  - 404 用预渲染的 `web/app/pages/not-found.vue` 顶替（`stage-site.mjs` 里改名成 `404.html`，17128 B / 正文 499 字）。
    **不要用 `app/pages/404.vue`**：Nuxt 不预渲染该路径，产物里只剩空 `_payload.json`。
- **线上后端（2026-11-15 新增，这是最大变化）**：Cloudflare Pages Functions + D1，同域 `/api/*`，零 CORS、零预算。
  - `functions/api/**` 11 个端点；D1 库 `xiancha-scan`（id `060db997-6713-4dd2-be8e-e2479b1ad5e7`），binding `DB` 写在 `wrangler.toml`。
  - `POST /api/scan` 真写 D1 表 `scan_log`（只存 `text_hash` + 计数 + 分数，**不存原文**），跨设备可见。
  - 实测：`/api/health` `{"status":"ok","db":true,"rules":63,...}`；POST 前后 `total` 0→1→2。
  - **Git 集成项目的 D1 binding 是以 binding 名为键的对象** `{"DB":{"id":"..."}}`，**不是数组**；写成数组 API 会静默丢弃。用 `tools/bind-d1.mjs`。
  - 本地调试 `npx wrangler pages dev .out` 时**不要带 `--d1=DB`**（miniflare 会另建空库，导致 `no such table: scan_log`）。
- **深色模式（2026-11-15）**：手动滑动开关 `ModeToggle.vue`（44×24，`role="switch"`），不跟随系统；
  `<head>` 内联脚本按 `localStorage.xc.mode` 防闪。深色只覆盖 `[data-mode="dark"]` 下的 `--color-*` 令牌（含 20 组 arbitrary 色值），正文对比度 21 组全 ≥4.5。
- **动效（2026-11-15）**：`web/app/assets/css/motion.css` 9 个克制动效，纯 CSS + IntersectionObserver，零动画库。
- **SEO（2026-11-15）**：`useSeo.ts` + 真生成 `og-cover.png`（1200×630，332119B）+ manifest + icons +
  71 页绝对唯一 canonical + JSON-LD（WebSite / Organization / 63 FAQPage / 2 ItemList / 70 BreadcrumbList）。
- **CI（2026-11-15）**：`.github/workflows/ci.yml`（node 22）跑 `tools/ci-check.mjs` 10 项断言，首次 run 已 success（39s）。
  不部署、不连 Postgres、无 secret。**`gh` token 必须含 `workflow` scope**，否则推 ci.yml 会被拒。
- **静态预渲染的两个硬约束**（踩过，别再犯）：
  1. `useApi()` 必须在 setup 期取 `useRuntimeConfig()` / `useState()` 并传给 `useAsyncData` 的 handler。
     handler 在 setup 之外执行，晚取会抛 `NUXT_E1001`，异常被吞后页面永远停在「正在读取」，HTML 里 0 字。
  2. `web/.env` **不能写 `NUXT_PUBLIC_API_BASE`**：`npm run generate` 也读 `.env`，会把 `127.0.0.1:8080` 烙进产物，
     线上每页挂一条「后端未连接」。`nuxt.config.ts` 已按 `NODE_ENV` 硬挡，静态构建恒为空串。
- **规模**：`web/app` 10 个页面 + 15 个组件 + 3 个 composable；`server/src` 36 文件；`functions/` 17 文件；
  `db/` 只剩 README + `migrations/d1/`；`02_站点` 84 文件（第一版静态站，线上已不跑它，只作断网兜底；同名物理备份在 `_backup/旧版-静态站-20261109/`，另打 tag `v1-static-20261109`）。
- **依赖版本**：nuxt 4.6.4 / vue 3.5.45 / pinia 4.1.0 / @pinia/nuxt 1.0.3 /
  tailwindcss 4.3.5 / @tailwindcss/vite 4.3.5 / typescript 7.0.2 / vue-tsc 3.3.14。node v26.13.0 / npm 11.20.0。运行时依赖只有 4 个。
- **方案**：`01_方案/先查_主方案.docx` 69324 B（179 段 / 28 表），第五章已改写成前后端分离口径。
- **未做**：`03_素材` 的访谈与真实合同收集（阳哥侧工作）；自定义域名未绑；本机 Spring Boot 版没有公网部署（线上已由 Functions 顶上）。
- **凭据**：数据库口令在项目根 `application-local.yml`（已 gitignore），`application.yml` 只留 `${DB_PASSWORD:}` 占位。
  Cloudflare OAuth token 约 24 小时过期，401 时重跑 `wrangler login --device`。
- **git 环境**：`http.sslBackend=openssl`（schannel 会报 `SEC_E_NO_CREDENTIALS`）、`http.sslverify=false`、`proxy=127.0.0.1:31181`。

