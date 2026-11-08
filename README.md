# 先查 · 项目目录（唯一工作位置）

> 从 2026-11-07 起，「先查」项目的所有文件都在这里。工作区 `deepseek-harness/default-workspace` 里不再放项目文件。
>
> **线上地址：https://xiancha.pages.dev**（Cloudflare Pages 免费套餐，2026-11-08 上线）
> **代码仓库：https://github.com/daijinyang1/xiancha**（公开，GitHub 账号 daijinyang1）

## 目录结构

```
先查项目/
  01_方案/
    先查_主方案.docx          参赛主方案（67 KB，用工具重新生成）
  02_站点/                    可直接双击 index.html 运行的纯静态站
    index.html                首页（三层结构 + 4 张入口卡）
    scan.html                 合同风险扫描
    rules.html / rules/       63 条规则的目录页 + 63 个独立词条页 R01…R63
    traps.html                12 条真实案例库
    certs.html                6 个可考证书日历
    about.html                关于
    js/  css/  data/          脚本、样式、数据（规则真源 = js/traps.js）
    check.js                  静态自检（83 文件 535900 字节）
    404.html                  找不到的地址回落到这一页（noindex），不当 200 首页返回
    robots.txt                允许抓取 + 指向 sitemap
    sitemap.xml               69 条绝对 URL（6 主页 + 63 词条），脚本生成
    _headers                  Pages 响应头：安全头 + 分级缓存
  03_素材/
    同类站点调研.md            竞品调研 + 优校网专节
    素材收集清单.md / 访谈记录模板.md / 软著材料清单.md
  tools/
    gen_rule_pages.mjs        从 js/traps.js 生成 63 个静态词条页 + sitemap.xml
    build_docx.py             从 _cfg_all.json 渲染主方案 docx
    cdp.mjs                   零依赖 CDP 控制（Node 26 自带 WebSocket）
    e2e.mjs                   真机端到端验收，6 组 26 项
    deploy.mjs                一条命令部署到 Cloudflare Pages
    live.mjs                  线上验收：真浏览器打开首页/词条/扫描/404，存截图并打印标题
    _cfg1..3.json _cfg_all.json   方案文档的结构配置
    docx/docx_base.py         docx 样式基类
    _shots/                   验收截图
```

## 常用命令（在本目录下执行）

```bat
:: 站点自检
cd 02_站点 && node check.js

:: 重新生成 63 个词条页
node tools\gen_rule_pages.mjs

:: 真机验收（--show 开可见窗口）
node tools\e2e.mjs

:: 重新渲染方案 docx
python tools\build_docx.py tools\_cfg_all.json

:: 部署上线（先 check + e2e 都过）
node tools\deploy.mjs

:: 部署后验线上（真浏览器，截图存 tools\_shots\live-*.png）
node tools\live.mjs
```

node 用 `C:/Users/21971/AppData/Local/nodejs/node.exe`（v26.13.0）。
python 用 `C:/Users/21971/.dsh/dsh-runtimes/dsh-primary-runtime/dependencies/python/python.exe`（3.12，有 python-docx / openpyxl / Pillow）。

## 改了规则之后

1. 改 `02_站点/js/traps.js`（规则唯一真源，字段顺序 id/ask/verdict/name/type/level/regex/why/law/fix）。
2. `node tools\gen_rule_pages.mjs` 重新生成词条页。
3. `cd 02_站点 && node check.js` 自检。
4. `node tools\e2e.mjs` 真机跑一遍。

## 代码仓库（GitHub）

```bat
git status                       :: 看改了什么
git add -A && git commit -m "说明" :: 存一次快照
git push                         :: 推到 https://github.com/daijinyang1/xiancha
```

- 仓库：**https://github.com/daijinyang1/xiancha**（public，默认分支 main）
- `.gitignore` 排掉 `.stage/`、`.wrangler/` 与系统垃圾；**明文凭据任何情况下都不许进仓库**。
- GitHub 与 Cloudflare Pages **是两条独立的线**：push 到 GitHub 不会自动部署，部署仍然走 `node tools\deploy.mjs`。GitHub 只是代码存档与备份。
- 命令行工具 `gh` 装在 `C:\Users\21971\.xiancha-deploy\gh\bin\gh.exe`（2.103.3），登录态在系统凭据管理器（keyring），账号 daijinyang1。

## 上线（已经上线，日常一条命令）

线上地址 **https://xiancha.pages.dev**，Cloudflare Pages 免费套餐，不接 GitHub、不走构建，直接把静态文件传上去。

```bat
cd 02_站点 && node check.js   :: 必须「结果：无错误」
node tools\e2e.mjs             :: 必须 26 项全过
node tools\deploy.mjs          :: stage 成 .stage/ → 上传 → 打印预览与生产地址
```

- wrangler 装在 `C:\Users\21971\.xiancha-deploy\node_modules\wrangler\bin\wrangler.js`（4.158.0，全局独立目录，不会被清理临时目录带走）。
- 登录态在 `C:\Users\21971\AppData\Roaming\xdg.config\.wrangler\config\default.toml`，过期就重跑 `wrangler login --device`。
- `deploy.mjs` 会先剔除 `check.js` 与 `README.md`（不该上线的两个文件），上传后自动删 `.stage/`。
- 新域名或换域名：改 `tools/gen_rule_pages.mjs` 顶部 `const SITE_ORIGIN = 'https://xiancha.pages.dev';`，重跑生成 sitemap，再部署。

### 部署后必做的线上验收

```bat
node tools\live.mjs
```

它用真实 Chrome 打开 `https://xiancha.pages.dev` 的首页、`/rules`、`/rules/R01`、`/scan` 和一个不存在的地址，逐页打印 title / h1 / 正文字数并存截图。四个正常页要能出标题，不存在的地址要落到「页面不存在」。

### 页面地址规则（重要）
Pages 会把 `/xxx.html` **308 跳**到 `/xxx`。所以对外一律用干净地址：`/scan`、`/rules/R01`、`/rules`。sitemap 里也是干净地址，写 `.html` 会被搜索引擎当成两份内容。

### 关于 `_headers`
它是给 Pages 消费的配置，直接访问 `https://xiancha.pages.dev/_headers` 返回 404 是**正常的**，别当故障。里面的组与组之间必须空一行，否则解析错。