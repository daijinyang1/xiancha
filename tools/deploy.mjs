// 部署静态站到 Cloudflare Pages（直传方式，不依赖 Git）。
// 用法：node tools/deploy.mjs
// 暂存逻辑统一在 tools/stage-site.mjs，与 Cloudflare Git 构建保持同一份产物。
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { stageSite } from './stage-site.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const STAGE = path.join(ROOT, '.stage');
const WRANGLER = 'C:\\Users\\21971\\.xiancha-deploy\\node_modules\\wrangler\\bin\\wrangler.js';
const ACCOUNT = '24c86e80a1c0e1459c679cd3ae0508ea';
const PROJECT = 'xiancha';

// 1. stage：拷一份干净的 public
const n = stageSite(STAGE);
console.log('stage: ' + n + ' 个文件');

// 2. 部署
const args = [WRANGLER, 'pages', 'deploy', '.stage', '--project-name=' + PROJECT,
  '--branch=main', '--commit-dirty=true'];
console.log('uploading...');
try {
  const out = execFileSync(process.execPath, args, {
    cwd: ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'],
    env: { ...process.env, CLOUDFLARE_ACCOUNT_ID: ACCOUNT },
  });
  console.log(out);
  const m = out.match(/https:\/\/[a-z0-9]+\.xiancha\.pages\.dev/);
  if (m) console.log('预览地址: ' + m[0]);
  console.log('生产地址: https://xiancha.pages.dev');
} finally {
  fs.rmSync(STAGE, { recursive: true, force: true });
}
