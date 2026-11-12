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
| `server/src/main/resources/db/migration/` | `V1__schema.sql` 建表、`V2__seed.sql` 灌数据 |
| `server/src/main/java/com/xiancha/service/ScanService.java` | 扫描引擎：切句 → 正则匹配 → 同句合并 → 打分排序 → 落扫描日志 |
| `web/app/pages/` | 9 个页面：`/` `/scan` `/rules` `/rules/[id]` `/traps` `/certs` `/about` `/history` `/stats` |
| `web/app/composables/useApi.ts` | 唯一后端访问层：9 个取数方法 + 2500ms 超时 + 降级兜底 |
| `web/app/components/` | 页头/页脚/卡片/徽章/Toast/图标 + `Reveal`（滚动入场）`CountUp`（数字滚动）`ProgressRing`（环形进度） |
| `web/app/data/*.json` | **构建期快照**，由 `tools/db-export.mjs` 从数据库导出，**不许手改** |
| `tools/db-export.mjs` | 库 → 快照导出（构建第 0 步）；`--check` 比对库与快照是否一致 |
| `tools/verify-stack.mjs` | 全栈自检：数据库 → 后端接口 → 扫描落库 → 前后端字段对齐 |
| `02_站点/` | 第一版纯静态站（无后端），线上 https://xiancha.pages.dev 跑的就是它；**不再开发**，只作断网兜底 |
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
python tools\build_docx.py tools\_cfg_all.json   :: 重新渲染方案 docx
python tools\verify_docx.py                       :: 核对 179 段/28 表/19968 字 + 扫旧口径
```
- node：`C:/Users/21971/AppData/Local/nodejs/node.exe`（v26.13.0）
- python：`C:/Users/21971/.dsh/dsh-runtimes/dsh-primary-runtime/dependencies/python/python.exe`（3.12，有 python-docx / openpyxl / Pillow）；系统 python 是 WindowsApps 占位符，不可用。
- maven：`D:\App\maven\bin\mvn.cmd`，本地仓库 `D:\App\maven-repo`；JDK 21 在 `D:\App\jdk21`。

## 5. 改东西的规矩
1. **改数据只改数据库**：连 PostgreSQL 改 `rule`/`trap`/`cert` 表 → `node tools/db-export.mjs` 导快照 → `node tools/db-export.mjs --check` 验一致。要让改动可复现就新建 `V3__xxx.sql` 写增量（**不要改已跑过的 V1/V2**，Flyway 有校验和，改了启动必失败）。**没有 `db/*.json` 了，别再找。**
2. **方案 docx 是生成物**：改 `tools/_cfg_all.json`（或 `_cfg1/2/3.json` 后按序拼回），再 `python tools/build_docx.py tools/_cfg_all.json`。禁止手工改 docx 正文。
   拼接关系：`_cfg_all.blocks = _cfg1.blocks(48) + _cfg2(59) + _cfg3(69) = 176`，`_cfg2/_cfg3` 是纯数组，无外壳。
3. **页面只通过 `useApi.ts` 取数**，不许在页面里直接 import `app/data/*.json`（那是兜底专用的）。
4. **降级必须留着**：任何新的取数逻辑都要接进 `useApi` 的统一 catch，后端挂了页面只能多一条黄条，不能白屏或抛错。
5. 对外链接一律用干净地址（`/scan` 不是 `/scan.html`）：Cloudflare Pages 会把 `.html` 308 跳走。
6. 文案数字全站一致：63 条规则 / 12 条案例 / 8 类坑型 / 6 个证书。
7. 仓库 public：密钥、token、密码一律不进仓库（数据库口令只是本机开发口令，不进任何文档截图）。
8. **`nuxt dev` 必须带 `--host 127.0.0.1`**（默认只听 `::1`，用 127 打开会报「服务器不可用」）。

## 6. 自检清单（交付前必过）
- [ ] `node tools/smoke.mjs` → 44 项全过
- [ ] `node tools/cdp_web.mjs` → 7 个路由都出标题、控制台 0 error
- [ ] 关掉后端刷新一次 → 只多一条「后端未连接」，不白屏、扫描仍出结果
- [ ] `node tools/cdp_func.mjs` → 交互 5 组全过
- [ ] 首页截图肉眼看过，四张入口卡都在
- [ ] 方案 docx 重新渲染过，`python tools/verify_docx.py` 无旧口径残留（当前 179 段 / 28 表 / 19968 字）
- [ ] https://xiancha.pages.dev 能打开（静态版），404 兜底生效
- [ ] 手机打开一次，确认不是只在本机能开

## 7. 当前状态（2026-11-11）

- **本机全栈**：`启动.bat` 三端口齐（5432 PostgreSQL / 8080 后端 / 3000 前端）时，`smoke.mjs` 44/44、`cdp_web.mjs` 7/7。
- **线上静态版 = Nuxt 预渲染产物**（2026-11-11 换掉旧的手写 HTML 静态站）：https://xiancha.pages.dev
  - Pages 项目 `xiancha`，源 `daijinyang1/xiancha@main`，**构建命令 `node tools/build-site.mjs .out`**，输出目录 `.out`，根目录留空。
  - push 后 40～90 秒自动上线；产出口径 **163 文件 / 69 条 sitemap URL**（6 主页面 + 63 词条 + 404 + robots + `_headers`）。
  - 输出形态是**扁平 `xxx.html`**（`nitro.prerender.autoSubfolderIndex: false`）。目录式输出会让 Pages 把 `/scan` 308 跳到 `/scan/`。
  - 404 用预渲染的 `web/app/pages/not-found.vue` 顶替（`stage-site.mjs` 里改名成 `404.html`，8099 B / 正文 410 字）。
    **不要用 `app/pages/404.vue`**：Nuxt 不预渲染该路径，产物里只剩空 `_payload.json`。
  - 验收命令：`node tools/_body.mjs xiancha.pages.dev`（逐路由正文字数）、`node tools/_head.mjs xiancha.pages.dev /scan`（状态码与跳转）。
- **静态预渲染的两个硬约束**（踩过，别再犯）：
  1. `useApi()` 必须在 setup 期取 `useRuntimeConfig()` / `useState()` 并传给 `useAsyncData` 的 handler。
     handler 在 setup 之外执行，晚取会抛 `NUXT_E1001`，异常被吞后页面永远停在「正在读取」，HTML 里 0 字。
  2. `web/.env` **不能写 `NUXT_PUBLIC_API_BASE`**：`npm run generate` 也读 `.env`，会把 `127.0.0.1:8080` 烙进产物，
     线上每页挂一条「后端未连接」。`nuxt.config.ts` 已按 `NODE_ENV` 硬挡，静态构建恒为空串。
- **规模**：`web/app` 21 文件（新增 `error.vue` + `pages/not-found.vue`）；`server/src` 31 文件 99979 B；`db/` 4 文件 70187 B；
  `02_站点` 84 文件 544377 B（第一版静态站，线上已不跑它，只作断网兜底；同名物理备份在 `_backup/旧版-静态站-20261109/`，另打 tag `v1-static-20261109`）。
- **依赖版本（2026-11-11 全部 latest）**：nuxt 4.6.4 / vue 3.5.45 / pinia 4.1.0 / @pinia/nuxt 1.0.3 /
  tailwindcss 4.3.5 / @tailwindcss/vite 4.3.5 / typescript 7.0.2 / vue-tsc 3.3.14。node v26.13.0 / npm 11.20.0。
- **方案**：`01_方案/先查_主方案.docx` 69324 B（179 段 / 28 表），第五章已改写成前后端分离口径。
- **未做**：`03_素材` 的访谈与真实合同收集（阳哥侧工作）；自定义域名未绑；全栈版没有公网部署（零预算，需一台常驻服务器）。
- **凭据**：数据库口令在项目根 `application-local.yml`（已 gitignore），`application.yml` 只留 `${DB_PASSWORD:}` 占位。
  Cloudflare OAuth token 约 24 小时过期，401 时重跑 `wrangler login --device`。
- **git 环境**：`http.sslBackend=openssl`（schannel 会报 `SEC_E_NO_CREDENTIALS`）、`http.sslverify=false`、`proxy=127.0.0.1:31181`。

