// 本地静态产物探测（纯 http，给 tools/_serve.mjs 起的预览服务用）
//   node tools/_probe_local.mjs [port] [path1,path2,...]
import http from 'node:http';

const port = Number(process.argv[2] || 4173);
const paths = (process.argv[3] || '/,/scan,/traps,/rules,/certs,/about,/rules/R01,/rules/R63,/robots.txt,/sitemap.xml,/nope-xyz,/scan.html')
  .split(',')
  .filter(Boolean);

function get(path) {
  return new Promise((resolve) => {
    const req = http.get({ host: '127.0.0.1', port, path, timeout: 8000 }, (res) => {
      const chunks = [];
      res.on('data', (c) => chunks.push(c));
      res.on('end', () => {
        const body = Buffer.concat(chunks).toString('utf8');
        const text = body
          .replace(/<script[\s\S]*?<\/script>/gi, ' ')
          .replace(/<style[\s\S]*?<\/style>/gi, ' ')
          .replace(/<[^>]+>/g, ' ')
          .replace(/\s+/g, ' ')
          .trim();
        resolve({ path, status: res.statusCode, bytes: Buffer.byteLength(body), loc: res.headers.location || '', text: text.length, title: (body.match(/<title>([^<]*)<\/title>/) || [, ''])[1] });
      });
    });
    req.on('error', (e) => resolve({ path, status: 'ERR', bytes: 0, text: 0, title: e.message }));
    req.on('timeout', () => { req.destroy(); resolve({ path, status: 'TIMEOUT', bytes: 0, text: 0, title: '' }); });
  });
}

for (const p of paths) {
  const r = await get(p);
  console.log(`${r.path.padEnd(16)} ${String(r.status).padEnd(8)} ${String(r.bytes).padEnd(7)} 正文${String(r.text).padStart(5)}字 ${r.loc ? '→ ' + r.loc + '  ' : ''}${r.title}`);
}
