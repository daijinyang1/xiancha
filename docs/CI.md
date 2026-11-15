# 先查 · CI 回归门禁（docs/CI.md）

> 一句话：`.github/workflows/ci.yml` 只做「构建 + 断言」，**不部署**；所有断言逻辑在
> `tools/ci-check.mjs`，本地跑的是同一份代码。

## 0. 为什么要有 CI

这个站是**纯静态预渲染**产物，最容易坏的地方都不在浏览器里显形：

| 故障形态 | 浏览器里看起来 | 真实后果 |
|---|---|---|
| 构建机连了本地后端 | 正常 | 线上 HTML 烙进「后端未连接」黄条 |
| `.env` 的 `NUXT_PUBLIC_API_BASE` 进产物 | 正常 | 全站请求 `127.0.0.1:8080`，线上扫不了 |
| `not-found.html` 没顶替成 `404.html` | 正常 | 404 变成 1072 字节空壳，爬虫看到白页 |
| 规则页少渲染几条 | 正常 | sitemap 与内链指向 404 |
| 预渲染失败但没 `failOnError` | 正常 | 首页正文 0 字，SEO 归零 |

改一行 CSS、动一个 layout，这些都不会立刻报错。所以需要一层**针对产物**的机器校验。

## 1. 流水线干什么

`.github/workflows/ci.yml`，runner `ubuntu-latest` + **Node 22**（与 Cloudflare Pages 构建机一致，
避免「本地能过、线上构建挂」）：

| # | 步骤 | 为什么 |
|---|---|---|
| 1 | `actions/checkout@v4` | — |
| 2 | `actions/setup-node@v4`（`node-version: "22"`，npm 缓存 `web/package-lock.json`） | 版本与线上构建机对齐 |
| 3 | `cd web && npm ci --no-audit --no-fund` | 用 lockfile 装，保证可复现 |
| 4 | `node tools/db-export.mjs` | **CI 里没有 Postgres**，走 `isCi` 回落分支读仓库快照。这条本身就是回归测试：三份快照必须存在 |
| 5 | `node tools/build-site.mjs .out`（`tee .ci/build.log`） | 完整构建链路，与 Pages 的 build_command 相同 |
| 6 | `node tools/ci-check.mjs --out .out --log .ci/build.log` | 10 项断言，失败退出码 1 |
| 7 | `actions/upload-artifact@v4`（`if: failure()`） | 失败时把 `.ci/` 与 `.out/` 传上来，7 天保留 |

触发：`push`（main）、`pull_request`、`workflow_dispatch`。
权限只给 `contents: read`；**没有任何 secret**，也**没有部署步骤**——线上由 Cloudflare Pages
自己的 Git 集成负责，CI 再部署一次两边会打架。

两条容易踩的坑，已在 yml 里处理：

- `on:` 加引号写成 `"on":`。YAML 1.1 会把裸 `on` 解析成布尔 `true`，虽然 GitHub 自己容错，
  但很多编辑器/校验器会误报。
- 构建步骤显式 `set -o pipefail`。GitHub 默认 bash 不带 pipefail，`... | tee log` 会拿 `tee`
  的退出码，构建失败会被吞掉。

## 2. 十项断言（`tools/ci-check.mjs`）

门槛值写在脚本顶部，改门槛等于改验收口径。

| # | 断言 | 门槛 | 为什么存在 |
|---|---|---|---|
| 01 | 数据快照三份齐全 | `rules/traps/certs.json` 存在、是合法 JSON、非空数组、每条有 `id` | CI 无库，快照就是数据源。空快照会让构建在 `nuxt.config.ts` 读 `rules.json` 时才炸，报错跟真因完全对不上 |
| 02 | 产物存在且文件数达标 | ≥160 个文件 | 防止 build 半途退出却留下一个「看起来有 `.out`」的目录 |
| 03 | 预渲染路由数 | ≥146（读日志 `Prerendered N routes`；无日志时按 html+payload 估算，门槛 140） | 页面被悄悄删掉/漏渲染的第一道闸 |
| 04 | 无「后端未连接」黄条 | 0 个 html 命中 | 静态构建误连后端 |
| 05 | 无 `127.0.0.1:8080` 泄漏 | 0 个 html 命中 | `.env` 被打进产物的经典事故 |
| 06 | `404.html` 不是空壳 | >8000 字节**且**正文 >200 字 | Nuxt 自带 404 只有 1072 字节；靠 `stage-site.mjs` 用 `not-found.html` 顶替 |
| 07 | sitemap 条目 | ≥71 条 `<loc>` | 8 个主页面 + 63 条规则，掉条目等于掉收录 |
| 08 | 首页正文非白页 | ≥2000 字（去 script/style/标签） | `NUXT_E1001` 之类的预渲染故障会产出「有 HTML、没正文」的页面 |
| 09 | 页面齐全 | 8 个主页面存在 + 每条 `rules.json` 里的规则页 >5000 字节 | 规则页空壳比 404 更糟：200 状态 + 无内容 |
| 10 | CSS 时长合规 | `main.css` 非循环动画/过渡 ≤700ms，其它 css ≤1000ms，`infinite` 循环动画豁免 | 入场 620ms 是既有规范；误加 3s 过渡会拖垮交互感，且很难在 review 里看出来 |

**断言刻意只锁核心指标**：别人往 `web/` 加组件、改配色、加 `motion.css`、加 `og-cover.png`，
只要上面这些还成立就算过；反过来把规则页从 63 条删到 40 条立刻红。
新增的 CSS 文件自动纳入第 10 项扫描（按文件名豁免 `main.css` 的 700ms 上限，其它给 1000ms 放宽带）。

## 3. 本地复现

```bash
cd 先查项目

# 完整链路（本机有 PostgreSQL 时会真连库导出，再预渲染）
node tools/build-site.mjs .out 2>&1 | tee .ci/build.log

# 断言（带日志能校验路由数；不带日志则按产物估算）
node tools/ci-check.mjs --out .out --log .ci/build.log
```

只看断言、不想重建：直接 `node tools/ci-check.mjs --log .ci/build.log`（默认 `--out .out`）。

### 只验证 CI 的数据回落分支

CI 的关键前提是「没有 psql 也能构建」。本机有 psql，所以要显式模拟：

```bash
# 模拟 ubuntu runner：PSQL_BIN 指向不存在的路径
CI=true PSQL_BIN=/usr/bin/psql node tools/db-export.mjs   # 期望 exit 0

# 快照不齐时必须失败（这是 01 项断言的脚本侧对应）
CI=true PSQL_BIN=/usr/bin/psql node tools/db-export.mjs   # 搬走任意一份 json 后期望 exit 2
```

`db-export.mjs` 的 psql 探测规则：

- `PSQL_BIN` 含路径分隔符（`/` 或 `\`）→ 按文件存在性判断（默认值 `D:/App/PostgreSQL/bin/psql.exe` 走这条）；
- `PSQL_BIN` 是裸命令名（如 `psql`）→ 在 `PATH` 里查（Windows 追加 `.EXE` 等 `PATHEXT` 后缀）。

早前只写 `fs.existsSync(PSQL)`，裸命令名会被当成「不存在」而静默用旧快照；现已修正。

## 4. 本地故意制造失败（验证门禁真的会红）

```bash
cp .out/404.html /tmp/404.bak && : > .out/404.html
node tools/ci-check.mjs --log .ci/build.log; echo "exit=$?"   # 期望 FAIL + exit 1
cp /tmp/404.bak .out/404.html && node tools/ci-check.mjs --log .ci/build.log   # 恢复后 10/10
```

## 5. 什么时候该改这个门禁

- **加了新页面**：`nuxt.config.ts` 的 `PRE_RENDER_ROUTES` 要加，`MIN_ROUTES`/`MIN_LOCS` 可能跟着调。
- **改了动画规范**：改 `ci-check.mjs` 顶部的 `MAIN_CSS_MAX_MS`，别去 yml 里加正则。
- **数据表增减**：`db-export.mjs` 的 `QUERIES` 与 `ci-check.mjs` 第 01 项要同步。
