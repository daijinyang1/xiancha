
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SITE = path.join(ROOT, '02_站点');
const STAGE = path.join(ROOT, '.stage');
const WRANGLER = 'C:\\Users\\21971\\.xiancha-deploy\\node_modules\\wrangler\\bin\\wrangler.js';
const ACCOUNT = '24c86e80a1c0e1459c679cd3ae0508ea';
const PROJECT = 'xiancha';
const EXCLUDE = new Set(['check.js', 'README.md']);

// 1. stage：把站点拷成一份干净的 public，去掉不该上线的文件
fs.rmSync(STAGE, { recursive: true, force: true });
const copy = (src, dst, rel = '') => {
  fs.mkdirSync(dst, { recursive: true });
  for (const e of fs.readdirSync(src, { withFileTypes: true })) {
    if (EXCLUDE.has(e.name)) continue;
    const s = path.join(src, e.name), d = path.join(dst, e.name);
    if (e.isDirectory()) copy(s, d, rel + e.name + '/');
    else fs.copyFileSync(s, d);
  }
};
copy(SITE, STAGE);

const walk = (d, base = '') => fs.readdirSync(d, { withFileTypes: true })
  .flatMap(e => e.isDirectory() ? walk(path.join(d, e.name), base + e.name + '/') : [base + e.name]);
const files = walk(STAGE);
console.log('stage: ' + files.length + ' 个文件');

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
