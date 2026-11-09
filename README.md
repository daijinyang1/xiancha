# 先查 · 项目目录（唯一工作位置）

> 从 2026-11-07 起，「先查」项目的所有文件都在这里。工作区 `deepseek-harness/default-workspace` 里不放项目文件。
>
> **本机全栈（主形态）：** 双击 `启动.bat` → 前端 http://127.0.0.1:3000 ，后端 http://127.0.0.1:8080/api
> **线上（静态版）：** https://xiancha.pages.dev （Cloudflare Pages 免费套餐）
> **代码仓库：** https://github.com/daijinyang1/xiancha （public，默认分支 main）

## 技术栈

| 层 | 选型 | 说明 |
|---|---|---|
| 前端 | Nuxt 4.6.4 + Vue 3.5.45 + Pinia 4.1.0 | SPA 模式（`ssr: false`），纯客户端渲染 |
| 样式 | Tailwind CSS 4.3.5（`@tailwindcss/vite` 插件） | 不走 postcss，配色深蓝 #1F4E79 + 红 #C0392B |
| 构建 | Vite（Nuxt 内置） | 无额外配置 |
| 后端 | Spring Boot 3.3.13 + JDK 21 + Maven 3.9.9 | 端口 8080，包名 `com.xiancha` |
| 数据库 | PostgreSQL 18.1 + Flyway | `127.0.0.1:5432`，库/用户/口令都是 `xiancha` |

**数据只有一条线：** `db/*.json` 是唯一真源 → 数据库三张表是它的投影（Flyway `V2__seed.sql` 灌入）→ `web/app/data/*.json` 是前端兜底用的拷贝。三处数字必须一致：**63 条规则 / 12 条案例 / 6 个证书 / 8 类坑型**。

## 目录结构

```
先查项目/
  启动.bat                      一键起：PostgreSQL → 后端 :8080 → 前端 :3000 → 自动开浏览器
  停止.bat                      按端口杀 8080 与 3000（不动 PostgreSQL 系统服务）
  API契约.md                    前后端唯一契约：7 个接口的路径、入参、返回结构
  db/                           三份 json 真源（rules 63 / traps 12 / certs 6）+ 字段说明
  server/                       Spring Boot 后端
    src/main/java/com/xiancha/  controller 5 / service 6 / entity 4 / repository 4 / dto 6
    src/main/resources/db/migration/   V1__schema.sql 建表、V2__seed.sql 灌数据
    target/xiancha-server-1.0.0.jar    打好包的可执行 jar
  web/                          Nuxt 前端
    app/pages/                  7 个路由：/ /scan /rules /rules/[id] /traps /certs /about
    app/composables/useApi.ts   唯一后端访问层：6 个取数方法 + 2500ms 超时 + 降级兜底
    app/components/             页头、页脚、卡片、风险徽章、Toast、入口图标
    app/data/*.json             三份内置快照，只在后端不通时用
  02_站点/                      第一版纯静态站（无后端），线上 pages.dev 跑的就是它；作为断网兜底保留，不再开发
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

:: —— 以下只针对 02_站点 静态版 ——
cd 02_站点 && node check.js       :: 静态自检（83 文件 535900 字节）
node tools\e2e.mjs                :: 静态版真机验收 26 项
node tools\deploy.mjs             :: 部署静态版到 Cloudflare Pages
node tools\live.mjs               :: 部署后线上验收
```

- node：`C:/Users/21971/AppData/Local/nodejs/node.exe`（v26.13.0）
- python：`C:/Users/21971/.dsh/dsh-runtimes/dsh-primary-runtime/dependencies/python/python.exe`（3.12，有 python-docx / openpyxl / Pillow）；系统 python 是 WindowsApps 占位符，不可用。
- maven：`D:\App\maven\bin\mvn.cmd`（本地仓库 `D:\App\maven-repo`）；JDK 21 在 `D:\App\jdk21`。

## 改了数据之后（三处同步）

1. 改 `db/rules.json`（或 traps / certs）。
2. 在 `server/src/main/resources/db/migration/` 下**新建**一个 `V3__xxx.sql` 写增量（改哪行就 `UPDATE rule SET ... WHERE id = 'R01';`）。**不要改已经跑过的 V1/V2** —— Flyway 记了校验和，改了会启动失败。
3. 拷一份到 `web/app/data/`（前端兜底用），三处数字对一遍。
4. 重启后端，Flyway 自动执行 V3；启动日志里会打印 `Migrating schema "public" to version "3 - xxx"`。
5. `node tools\smoke.mjs` 44 项全过。

## 改了前端之后

`npm run dev` 会热更新，不用重启。改完跑 `node tools\cdp_web.mjs` 看七个路由有没有报错、`node tools\cdp_func.mjs` 看交互没坏。

**注意：** `nuxt dev` 默认只监听 `::1`（IPv6 回环），用 `http://127.0.0.1:3000` 打开会报「服务器不可用」。`web/package.json` 的 dev 脚本里已经写死 `--host 127.0.0.1`，别改回去。

## 后端降级机制（这是设计的卖点，不是缺陷）

`web/app/composables/useApi.ts` 里每个方法只有一个降级出口：请求失败 → 回落到 `app/data/*.json` 内置快照 → `markDegraded(reason)` → 页面顶部出现琥珀色「后端未连接」条。所以后端挂了页面不白屏、扫描照样能出结果，只是数据是快照里的那一份。

现场演示的三层兜底：本机全栈 → 只起前端（后端降级） → 线上静态版。

## 部署静态版（02_站点）

```bat
cd 02_站点 && node check.js   :: 必须「结果：无错误」
node tools\deploy.mjs          :: stage 成 .stage/ → 上传 → 打印预览与生产地址
node tools\live.mjs            :: 线上验收（真浏览器 + 截图）
```

- wrangler 在 `C:\Users\21971\.xiancha-deploy\node_modules\wrangler\bin\wrangler.js`（4.158.0）。
- 登录态在 `C:\Users\21971\AppData\Roaming\xdg.config\.wrangler\config\default.toml`，过期就重跑 `wrangler login --device`。
- Pages 会把 `/xxx.html` **308 跳**到 `/xxx`，对外一律用干净地址；`_headers` 直接访问返回 404 属正常。

## 代码仓库（GitHub）

```bat
git status
git add -A && git commit -m "说明"
git push
```

- 仓库 **https://github.com/daijinyang1/xiancha**（public，main）。`.gitignore` 排掉 `.stage/`、`.wrangler/`、`node_modules/`、系统垃圾与明文凭据。
- **push 不等于部署**：GitHub 只是代码存档；静态版部署仍走 `node tools\deploy.mjs`，全栈版本机跑。
- 仓库是 public：密钥、token、密码一律不许提交。数据库口令只在本机 `application.yml` 里，且是本地开发口令。
- `gh` 装在 `C:\Users\21971\.xiancha-deploy\gh\bin\gh.exe`（2.103.3），登录态在系统 keyring。
