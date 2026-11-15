/* tools/_seo/shoot-og.mjs —— 用项目自带 tools/cdp.mjs 起 headless Chrome，
   把 og-cover.html 按 1200×630 截成 web/public/og-cover.png。
   顺带用同一套品牌 mark 出 icon（180/192/512）—— 那几个另见 make-icons.py。

   用法：node tools/_seo/shoot-og.mjs
*/
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { launch, newPage, shutdown } from '../cdp.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..', '..');
const SRC = path.join(HERE, 'og-cover.html');
const OUT = path.join(ROOT, 'web', 'public', 'og-cover.png');
const W = 1200;
const H = 630;

if (!fs.existsSync(SRC)) throw new Error('缺模板：' + SRC);

const browser = await launch({ headless: true, width: W, height: H });
try {
  const page = await newPage(browser, pathToFileURL(SRC).href);
  await page.waitFor('document.readyState === "complete"');
  // 给字体一点落位时间
  await page.eval('document.fonts && document.fonts.ready ? document.fonts.ready.then(() => true) : true');
  await new Promise((r) => setTimeout(r, 250));

  // 关键：先固定视口 1200×630，再按这个矩形截图（不信 layout metrics，页面本身就是定尺的）
  await page.send('Emulation.setDeviceMetricsOverride', {
    width: W,
    height: H,
    deviceScaleFactor: 1,
    mobile: false,
  });
  await new Promise((r) => setTimeout(r, 120));

  const size = await page.eval(
    '({w: document.documentElement.scrollWidth, h: document.documentElement.scrollHeight, ' +
      'bw: document.body.scrollWidth, bh: document.body.scrollHeight})',
  );
  console.log('页面自量尺寸：', JSON.stringify(size));

  const shot = await page.send('Page.captureScreenshot', {
    format: 'png',
    captureBeyondViewport: false,
    clip: { x: 0, y: 0, width: W, height: H, scale: 1 },
  });
  if (!shot.result || !shot.result.data) throw new Error('captureScreenshot 没返回 data');
  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, Buffer.from(shot.result.data, 'base64'));
  const bytes = fs.statSync(OUT).size;
  console.log('写出：' + OUT);
  console.log('字节：' + bytes);
  if (bytes < 30 * 1024) throw new Error('og-cover.png 只有 ' + bytes + ' 字节，太像色块了');
  await page.close();
} finally {
  await shutdown(browser);
}
