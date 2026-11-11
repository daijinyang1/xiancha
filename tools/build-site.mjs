// 一条命令构建线上静态站：装依赖 → Nuxt 预渲染 → 暂存到 .out
// Cloudflare Pages 的构建命令就是它（见 Pages 项目 build_config.build_command）。
// 本地想复刻线上产物也跑这个：node tools/build-site.mjs [输出目录]
//
// 为什么要把三步合成一个脚本：Pages 的 build_command 只接受一条命令，
// 之前写的是 `node tools/stage-site.mjs .out`，那只是拷产物 —— 换了 Nuxt 之后必须先 generate，
// 否则 .output/public 不存在，暂存会直接报错。
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const WEB = path.join(ROOT, 'web');
const OUT = path.resolve(ROOT, process.argv[2] || '.out');

function run(cmd, args, cwd) {
  console.log(`\n$ ${cmd} ${args.join(' ')}   (cwd=${path.relative(ROOT, cwd) || '.'})`);
  const r = spawnSync(cmd, args, { cwd, stdio: 'inherit', shell: process.platform === 'win32' });
  if (r.status !== 0) {
    console.error(`[build-site] 失败：${cmd} 退出码 ${r.status}`);
    process.exit(r.status || 1);
  }
}

// 1) 依赖：没有 node_modules 就装（Pages 构建环境每次都是干净的，这一步必跑）
if (!fs.existsSync(path.join(WEB, 'node_modules', 'nuxt'))) {
  const hasLock = fs.existsSync(path.join(WEB, 'package-lock.json'))
  run('npm', hasLock ? ['ci', '--no-audit', '--no-fund'] : ['install', '--no-audit', '--no-fund'], WEB)
} else {
  console.log('[build-site] web/node_modules 已存在，跳过安装');
}

// 2) 预渲染 69 条路由（6 个主页面 + 63 条词条）
//    必须先删 .output：nuxt generate 不清旧产物，改了输出形态（目录式 ↔ 扁平 .html）后
//    新旧文件会同时留下，线上出现 /scan 与 /scan/ 两份重复内容。
fs.rmSync(path.join(WEB, '.output'), { recursive: true, force: true })
run('npx', ['nuxt', 'generate'], WEB)

// 3) 暂存：产物 + sitemap.xml（robots.txt / _headers 由 web/public 带进产物）
const { stageSite } = await import('./stage-site.mjs')
const r = stageSite(OUT)
console.log(`[build-site] 完成：${r.files} 个文件 / sitemap ${r.urls} 条 → ${path.relative(ROOT, OUT)}`)
