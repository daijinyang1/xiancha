// 把 Nuxt 预渲染产物暂存成一份可上线的干净目录。
//
// 用法：
//   cd web && npm run generate      # 先产出 web/.output/public
//   node tools/stage-site.mjs .out  # 再暂存（默认 .stage）
//
// 本地直传（tools/deploy.mjs）与 Cloudflare Git 构建都用这一份逻辑，
// 保证两边产物逐字节一致。缺产物就直接报错，不做静默降级。
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const BUILT = path.join(ROOT, 'web', '.output', 'public');
const RULES = path.join(ROOT, 'db', 'rules.json');
const ORIGIN = 'https://xiancha.pages.dev';
const OUT = path.resolve(ROOT, process.argv[2] || '.stage');

// 备份 / 临时 / 日志 / 内部载荷一律不上线
const isJunk = (name) => /\.(bak|tmp|orig|log|pyc)$/i.test(name) || /\.bak-/i.test(name);

function copyTree(src, dst) {
  fs.mkdirSync(dst, { recursive: true });
  for (const e of fs.readdirSync(src, { withFileTypes: true })) {
    if (isJunk(e.name)) continue;
    const s = path.join(src, e.name);
    const d = path.join(dst, e.name);
    if (e.isDirectory()) copyTree(s, d);
    else fs.copyFileSync(s, d);
  }
}

function countFiles(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).reduce(
    (n, e) => n + (e.isDirectory() ? countFiles(path.join(dir, e.name)) : 1),
    0,
  );
}

/** 由 db/rules.json 生成 sitemap：6 个主页面 + 每条规则一个干净地址 */
export function writeSitemap(dir) {
  const rules = JSON.parse(fs.readFileSync(RULES, 'utf8'));
  const paths = ['/', '/scan', '/traps', '/rules', '/certs', '/about', ...rules.map((r) => '/rules/' + r.id)];
  const body = paths.map((p) => '  <url><loc>' + ORIGIN + p + '</loc></url>').join('\n');
  const xml =
    '<?xml version="1.0" encoding="UTF-8"?>\n' +
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
    body +
    '\n</urlset>\n';
  fs.writeFileSync(path.join(dir, 'sitemap.xml'), xml, 'utf8');
  return paths.length;
}

export function stageSite(outDir = OUT) {
  if (!fs.existsSync(path.join(BUILT, 'index.html'))) {
    throw new Error('缺少 web/.output/public，请先执行：cd web && npm run generate');
  }
  fs.rmSync(outDir, { recursive: true, force: true });
  copyTree(BUILT, outDir);
  const urlCount = writeSitemap(outDir);
  return { files: countFiles(outDir), urls: urlCount };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const r = stageSite();
  console.log(`stage: ${r.files} 个文件 / sitemap ${r.urls} 条 → ${path.relative(ROOT, OUT) || OUT}`);
}
