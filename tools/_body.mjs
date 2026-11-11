// 抓线上页面正文摘要（去标签后的字数 + 开头一段），用来验收静态产物是否真的带内容
//   node tools/_body.mjs [host] [path1,path2,...]
import https from 'node:https';

const host = process.argv[2] || 'xiancha.pages.dev';
const paths = (process.argv[3] || '/,/scan,/traps,/rules,/certs,/about,/rules/R01,/rules/R63,/nope-xyz').split(',').filter(Boolean);

function get(path, depth = 0) {
  return new Promise((resolve) => {
    https.get({ host, path, timeout: 15000 }, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location && depth < 3) {
        res.resume();
        return resolve(get(res.headers.location, depth + 1));
      }
      const chunks = [];
      res.on('data', (c) => chunks.push(c));
      res.on('end', () => resolve({ status: res.statusCode, body: Buffer.concat(chunks).toString('utf8') }));
    }).on('error', (e) => resolve({ status: 'ERR', body: e.message }));
  });
}

for (const p of paths) {
  const { status, body } = await get(p);
  const text = body
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&[a-z]+;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  console.log(`${p.padEnd(12)} ${String(status).padEnd(5)} html=${String(Buffer.byteLength(body)).padStart(6)}B 正文=${String(text.length).padStart(5)}字 | ${text.slice(0, 70)}`);
}
