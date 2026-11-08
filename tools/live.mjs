import { launch, newPage, shutdown } from './cdp.mjs';
const b = await launch({ port: 9421, headless: true, width: 1440, height: 1100, extraArgs: ['--proxy-server=http://127.0.0.1:31181'] });
const out = [];
for (const [name, url] of [['home','https://xiancha.pages.dev/'],['rules','https://xiancha.pages.dev/rules'],['r01','https://xiancha.pages.dev/rules/R01'],['scan','https://xiancha.pages.dev/scan'],['notfound','https://xiancha.pages.dev/abc-not-exist']]) {
  const p = await newPage(b, url);
  try {
    const t = await p.eval('document.title');
    const h1 = await p.eval('(document.querySelector("h1")||{}).innerText || ""');
    const len = await p.eval('document.body.innerText.length');
    await p.shot('tools/_shots/live-' + name + '.png');
    out.push([name, url, t, String(h1).slice(0,40).replace(/\s+/g,' '), len].join(' | '));
  } catch (e) { out.push(name + ' ERR ' + e.message); }
}
await shutdown(b);
console.log(out.join('\n'));