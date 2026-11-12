# 先查 · 项目目录（唯一工作位置）

> 从 2026-11-07 起，「先查」项目的所有文件都在这里。工作区 `deepseek-harness/default-workspace` 里不放项目文件。
>
> **本机全栈（主形态）：** 双击 `启动.bat` → 前端 http://127.0.0.1:3000 ，后端 http://127.0.0.1:8080/api
> **线上（静态版）：** https://xiancha.pages.dev （Cloudflare Pages 免费套餐）
> **代码仓库：** https://github.com/daijinyang1/xiancha （public，默认分支 main）

## 技术栈

| 层 | 选型 | 说明 |
|---|---|---|
| 前端 | Nuxt 4.6.4 + Vue 3.5.45 + Pinia 4.1.0 | 双形态：本地 `ssr:true` 连后端；线上 `npm run generate` 预渲染成 69 页静态 HTML |
| 样式 | Tailwind CSS 4.3.5（`@tailwindcss/vite` 插件） | 不走 postcss，配色深蓝 #1F4E79 + 红 #C0392B |
| TypeScript | 7.0.2 + vue-tsc 3.3.14 | 2026-11-11 升到 latest |
| 构建 | Vite（Nuxt 内置）+ Nitro static preset | 预渲染 69 条路由，输出扁平 `xxx.html` |
| 后端 | Spring Boot 3.3.13 + JDK 21 + Maven 3.9.9 | 端口 8080，包名 `com.xiancha` |
| 数据库 | PostgreSQL 18.1 + Flyway | `127.0.0.1:5432`，库/用户/口令都是 `xiancha` |

**数据只有一条线（2026-11-12 起重构）：** **PostgreSQL 库 `xiancha` 是唯一真源**（表 `rule` / `trap` / `cert`）→ `node tools/db-export.mjs` 在构建第 0 步把它导成 `web/app/data/*.json` 快照 → Nuxt 预渲染把快照内联进静态 HTML。**不再有手写的 `db/*.json`**（已删除，见 `db/README.md`）。四个数字必须一致：**63 条规则 / 12 条案例 / 6 个证书 / 8 类坑型**。

## 目录结构

```
先查项目/
  启动.bat                      一键起：PostgreSQL → 后端 :8080 → 前端 :3000 → 自动开浏览器
  停止.bat                      按端口杀 8080 与 3000（不动 PostgreSQL 系统服务）
  API契约.md                    前后端唯一契约：7 个接口的路径、入参、返回结构
  db/                           数据真源说明（数据本身在 PostgreSQL，这里只有 README）
  server/                       Spring Boot 后端
    src/main/java/com/xiancha/  controller / service / entity / repository / dto
    src/main/resources/db/migration/   V1__schema.sql 建表、V2__seed.sql 灌数据
    target/xiancha-server-1.0.0.jar    打好包的可执行 jar
  web/                          Nuxt 前端
    app/pages/                  9 个页面：/ /scan /rules /rules/[id] /traps /certs /about /history /stats
    app/composables/useApi.ts   唯一后端访问层：9 个取数方法 + 2500ms 超时 + 降级兜底
    app/components/             页头、页脚、卡片、徽章、Toast、图标、Reveal/CountUp/ProgressRing 动效件
    app/data/*.json             构建期快照，由 tools/db-export.mjs 从数据库导出，**不要手改**
  02_站点/                      第一版纯静态站（无后端）。**2026-11-11 起线上不再跑它**，产物改由 web/ 预渲染；目录保留做断网兜底
  _backup/旧版-静态站-20261109/  旧静态站物理备份（另打 tag v1-static-20261109），不进仓库
  01_方案/先查_主方案.docx       参赛主方案（69324 B ≈ 67.7 KB），**生成物**，改 tools/_cfg_all.json 后重渲染
  03_素材/                      同类站点调研、素材收集清单、访谈模板、软著材料清单
  tools/                        验收、部署、文档生成脚本
```

## 常用命令（在本目录下执行）

```bat
:: 一键起停
启动.bat
停止.bat

:: 端到端验收（7 接口 + 扫描口径 + 7 路由 + 真浏览器渲染，44 项）
node tools\smoke.mjs

:: 七个路由逐个截图（存 tools/_shots/）
node tools\cdp_web.mjs

:: 交互验收（扫描、筛选、展开、倒计时，5 组）
node tools\cdp_func.mjs

:: 重新渲染方案 docx，然后核对段数/表数/字数并扫旧口径
python tools\build_docx.py tools\_cfg_all.json
python tools\verify_docx.py

:: —— 线上静态站（Nuxt 预渲染）——
node tools\build-site.mjs .out     :: 一条命令：npm ci → nuxt generate → 暂存（Pages 构建命令就是它）
node tools\_serve.mjs .out 4173    :: 本地按 Pages 口径预览 http://127.0.0.1:4173
node tools\_probe_local.mjs 4173   :: 本地产物逐路由探测（状态码 / 字节 / 正文字数）
node tools\_body.mjs xiancha.pages.dev   :: 线上逐路由看正文有没有真的进 HTML
node tools\_head.mjs xiancha.pages.dev /scan   :: 只看状态码与关键响应头
node tools\deploy.mjs              :: 手动直传（极少用，现在 push 即自动部署）
```

- node：`C:/Users/21971/AppData/Local/nodejs/node.exe`（v26.13.0）
- python：`C:/Users/21971/.dsh/dsh-runtimes/dsh-primary-runtime/dependencies/python/python.exe`（3.12，有 python-docx / openpyxl / Pillow）；系统 python 是 WindowsApps 占位符，不可用。
- maven：`D:\App\maven\bin\mvn.cmd`（本地仓库 `D:\App\maven-repo`）；JDK 21 在 `D:\App\jdk21`。

## 改了数据之后（只有一条路径）

**数据真源是 PostgreSQL，不是文件。**

1. 连库改数据：`PGPASSWORD=xiancha2026 D:/App/PostgreSQL/bin/psql.exe -h 127.0.0.1 -U xiancha -d xiancha`
   改 `rule` / `trap` / `cert` 表。
2. 如果要让改动**可复现**（换台机器也能建出同样的库），在 `server/src/main/resources/db/migration/` 下**新建** `V3__xxx.sql` 写增量（`UPDATE rule SET ... WHERE id = 'R01';`）。**不要改已经跑过的 V1/V2** —— Flyway 记了校验和，改了会启动失败。
3. `node tools/db-export.mjs` 把库导出成 `web/app/data/*.json`（构建期快照）。**不导就等于没改**，线上构建用的还是旧快照。
4. `node tools/db-export.mjs --check` 确认快照与库一致（退出码 0）。
5. `node tools/verify-stack.mjs` 全栈自检（数据库 → 后端接口 → 落库 → 前后端字段对齐）。
6. 提交推送，Pages 自动重新构建。

> `web/app/data/*.json` 是**生成物**，手改会在下次 `db-export` 被覆盖。

## 改了前端之后

`npm run dev` 会热更新，不用重启。改完跑 `node tools\cdp_web.mjs` 看九个页面有没有报错、`node tools\cdp_func.mjs` 看交互没坏。

**注意：** `nuxt dev` 默认只监听 `::1`（IPv6 回环），用 `http://127.0.0.1:3000` 打开会报「服务器不可用」。`web/package.json` 的 dev 脚本里已经写死 `--host 127.0.0.1`，别改回去。

## 后端降级机制（这是设计的卖点，不是缺陷）

`web/app/composables/useApi.ts` 里每个方法只有一个降级出口：请求失败 → 回落到 `app/data/*.json` 内置快照 → `markDegraded(reason)` → 页面顶部出现琥珀色「后端未连接」条。所以后端挂了页面不白屏、扫描照样能出结果，只是数据是快照里的那一份。

现场演示的三层兜底：本机全栈 → 只起前端（后端降级） → 线上静态版。

**线上静态版不显示这条黄条**：构建时 apiBase 是空串，`getJson` 直接抛 `OfflineError`，这个异常在 `markDegraded` 里被显式忽略——静态站本来就该只用随包数据，不该谎报「后端掉线」。改 `useApi.ts` 时别把这个特判删了。

**`useAsyncData` 的坑（2026-11-11 踩过）**：handler 在 setup 返回之后才执行，那时调 `useRuntimeConfig()` / `useState()` 会抛 `NUXT_E1001`，"A composable that requires access to the Nuxt instance was called outside of a plugin, Nuxt hook, Nuxt middleware, or Vue setup function"。预渲染时这个异常被吞，页面永远停在「正在读取词条……」，HTML 里一个字都没有。
解法：`useApi()` 在 setup 期就把 `base` 与 `status` 取到手，`getJson(base, path)` 显式收参，`markDegraded` 闭包引用 `status`。改这个文件时保持这个形状。

## 部署线上静态站（Nuxt 预渲染 → Cloudflare Pages）

**push 即部署：** `git push origin main` 后 Pages 自动克隆仓库、跑
`node tools/build-site.mjs .out`、把 `.out` 发布到 https://xiancha.pages.dev 。通常 40～90 秒上线。

```bat
git add -A && git commit -m "说明" && git push     :: 推完就等自动构建，日志在 Cloudflare 控制台
```

**构建链路：**

| 项 | 值 | 说明 |
|---|---|---|
| 构建命令 | `node tools/build-site.mjs .out` | 内部四件事：`node tools/db-export.mjs` 从 PostgreSQL 导快照 → 缺 `web/node_modules` 就 `npm ci` → 清 `web/.output` → `npx nuxt generate` → 暂存 |
| 输出目录 | `.out` | 仓库根的暂存目录（已 gitignore） |
| 根目录 | 空（仓库根） | 不要填 `web`，脚本自己在 `web/` 里执行 |

产出口径：**167 个文件 / 71 条 sitemap URL**（9 个页面 + 63 条词条 + 404 + robots + `_headers`）。

**数据从哪来：** 第 0 步 `db-export.mjs` 连 PostgreSQL 导快照。Cloudflare 构建机没有 Postgres，
它用的是仓库里已提交的快照（脚本检测到没有 psql 时自动走这条路）。所以**本地改完数据必须先
`node tools/db-export.mjs` 再提交**，否则线上还是旧数据。

**为什么必须分三步：** 旧构建命令是 `node tools/stage-site.mjs .out`，那只是把产物拷出来。
换成 Nuxt 后 `.output/public` 得先 `generate` 才有，所以合成一个 `build-site.mjs`。

**输出形态是扁平 `.html`**（`nitro.prerender.autoSubfolderIndex: false`）。
默认的目录式输出会让 Pages 把 `/scan` **308 跳到** `/scan/`，凭空多一跳还带尾巴；
扁平输出后 `/scan`、`/rules/R01` 直接 200。

**404 兜底：** Nuxt 自带的 `404.html` 是 SPA 入口壳（约 1.1 KB、正文 0 字），无 JS 环境与爬虫看到白页。
做法是 `web/app/pages/not-found.vue` 进预渲染列表，`stage-site.mjs` 拿 `not-found.html` 顶替 `404.html`
（8099 B / 正文 410 字）。**不要用 `app/pages/404.vue`** —— Nuxt 不预渲染该路径，产物里只留个空 `_payload.json`。

**本地预览与验收：**

```bat
node tools\build-site.mjs .out     :: 本地复刻线上产物
node tools\_serve.mjs .out 4173    :: 按 Pages 口径伺服（目录→index.html→path.html、404 兜底）
node tools\_probe_local.mjs 4173   :: 本地产物逐路由看状态码 / 字节 / 正文字数
node tools\_body.mjs xiancha.pages.dev          :: 线上逐路由看正文有没有真的进 HTML
node tools\_head.mjs xiancha.pages.dev /scan    :: 只看状态码与关键响应头（含 308 落点）
node tools\deploy.mjs              :: 手动直传（抢发或 Git 构建故障时才用）
```

**其它须知：**

- `tools/_cf.mjs` 是 Pages API 封装：`projects` / `project <名>` / `deployments <名>` /
  `logs <名>` / `buildcfg <名> build_command=.. destination_dir=.. root_dir=..` / `deploy <名> [分支]` / `create` / `delete`。
  **传参必须用 `key=value`**，PowerShell 会把空字符串参数吞掉。
- Cloudflare 登录态在 `C:\Users\21971\AppData\Roaming\xdg.config\.wrangler\config\default.toml`。
  token 大约 24 小时就过期，症状是 API 一律 401 / `Invalid API Token`。续期：
  `node C:\Users\21971\.xiancha-deploy\node_modules\wrangler\wrangler-dist\cli.js login --device`
  （别用 `bin/wrangler.js`，它 spawn 子进程会报 `spawn EPERM`）。浏览器里已有 Cloudflare 会话时会自动批准。
- **`.env` 里绝对不能写 `NUXT_PUBLIC_API_BASE`**：`npm run generate` 同样会读 `.env`，
  会把 `127.0.0.1:8080` 烙进静态产物，线上每页顶部挂一条「后端未连接」黄条。
  `nuxt.config.ts` 已按 `NODE_ENV` 硬挡：只有 dev 才取 apiBase，静态构建恒为空串。
- `web/public/_headers` 由 Nuxt 拷进产物：`/*` 设 nosniff / SAMEORIGIN / Referrer-Policy / Permissions-Policy；
  `/*.html` 强校验；`/_nuxt/*` 缓存 7 天 immutable。直接访问 `/_headers` 返回 404 属正常。
- Pages 会把 `/xxx.html` 308 跳到 `/xxx`，对外链接与 sitemap 一律写干净地址。

## 代码仓库（GitHub）

```bat
git status
git add -A && git commit -m "说明"
git push
```

- 仓库 **https://github.com/daijinyang1/xiancha**（public，main）。`.gitignore` 排掉 `.stage/`、`.out/`、`.wrangler/`、`node_modules/`、系统垃圾与明文凭据。
- **push 就是部署**（静态版）：Pages 监听 `main`，推送后自动构建上线，无需再跑 `deploy.mjs`。
- 仓库是 public：密钥、token、密码一律不许提交。数据库口令在本机 `application-local.yml`（已 gitignore），`application.yml` 只留占位符。
- `gh` 装在 `C:\Users\21971\.xiancha-deploy\gh\bin\gh.exe`（2.103.3），登录态在系统 keyring。
- git 走 schannel 会报 `SEC_E_NO_CREDENTIALS`，已设 `git config --global http.sslBackend openssl` 修复。
