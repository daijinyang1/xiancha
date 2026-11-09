// 把 02_站点 暂存成一份可上线的干净目录（去掉自检脚本、文档、备份与临时文件）。
// 用法：node tools/stage-site.mjs [目标目录，默认 .stage]
// 本地部署（tools/deploy.mjs）与 Cloudflare Git 构建都用它，保证两边的产物一致。
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SITE = path.join(ROOT, '02_站点');
const OUT = path.resolve(ROOT, process.argv[2] || '.stage');

// 明确排除的文件名
const EXCLUDE = new Set(['check.js', 'README.md']);
// 备份 / 临时 / 日志一律不上线
const isJunk = (name) => /\.(bak|tmp|orig|log|pyc)$/i.test(name) || /\.bak-/i.test(name);
// 目录级排除
const EXCLUDE_DIR = new Set(['node_modules', '__pycache__', '_shots', '.git']);

export function stageSite(outDir = OUT) {
  fs.rmSync(outDir, { recursive: true, force: true });
  const copy = (src, dst) => {
    fs.mkdirSync(dst, { recursive: true });
    for (const e of fs.readdirSync(src, { withFileTypes: true })) {
      if (EXCLUDE.has(e.name) || isJunk(e.name)) continue;
      const s = path.join(src, e.name);
      const d = path.join(dst, e.name);
      if (e.isDirectory()) {
        if (EXCLUDE_DIR.has(e.name)) continue;
        copy(s, d);
      } else {
        fs.copyFileSync(s, d);
      }
    }
  };
  copy(SITE, outDir);
  const count = (dir) =>
    fs.readdirSync(dir, { withFileTypes: true }).reduce(
      (n, e) => n + (e.isDirectory() ? count(path.join(dir, e.name)) : 1),
      0,
    );
  return count(outDir);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const n = stageSite();
  console.log(`stage: ${n} 个文件 → ${path.relative(ROOT, OUT) || OUT}`);
}
