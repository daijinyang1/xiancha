// 本地静态预览：把 .out（或任意目录）按 Pages 的口径伺服，用来在没有后端的情况下验收静态产物。
//   node tools/_serve.mjs [目录] [端口]
// 规则对齐 Cloudflare Pages：
//   /scan          → /scan/index.html
//   /xxx.html      → 308 跳到 /xxx（Pages 的行为，用来确认对外链接写干净地址）
//   找不到         → 404.html（状态码 404）
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DIR = path.resolve(ROOT, process.argv[2] || '.out');
const PORT = Number(process.argv[3] || 4173);

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.txt': 'text/plain; charset=utf-8',
  '.xml': 'application/xml; charset=utf-8',
  '.woff2': 'font/woff2',
};

function send(res, code, file, extra = {}) {
  res.writeHead(code, { 'content-type': TYPES[path.extname(file)] || 'application/octet-stream', ...extra });
  fs.createReadStream(file).pipe(res);
}

http
  .createServer((req, res) => {
    const url = decodeURIComponent((req.url || '/').split('?')[0]);
    if (url.endsWith('.html') && url !== '/404.html') {
      res.writeHead(308, { location: url.slice(0, -5) || '/' });
      return res.end();
    }
    let file = path.join(DIR, url);
    if (!file.startsWith(DIR)) {
      res.writeHead(403);
      return res.end('forbidden');
    }
    // 对齐 Pages 的解析顺序：精确文件 → 目录里的 index.html → path + .html
    if (fs.existsSync(file) && fs.statSync(file).isDirectory()) {
      const idx = path.join(file, 'index.html');
      if (fs.existsSync(idx)) file = idx;
      else if (fs.existsSync(file + '.html')) file = file + '.html';
    }
    if (!fs.existsSync(file) && fs.existsSync(file + '.html')) file = file + '.html';
    if (fs.existsSync(file)) return send(res, 200, file);
    const notFound = path.join(DIR, '404.html');
    if (fs.existsSync(notFound)) return send(res, 404, notFound);
    res.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' });
    res.end('404');
  })
  .listen(PORT, '127.0.0.1', () => console.log(`preview http://127.0.0.1:${PORT}/  ← ${path.relative(ROOT, DIR)}`));
