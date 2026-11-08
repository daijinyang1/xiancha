/* tools/cdp.mjs —— 用你本机 Chrome 的 DevTools 协议控制浏览器。
   为什么不用 puppeteer：这台机器上没装，也不打算为了一个自检脚本装 300MB 依赖。
   Chrome 自带 --remote-debugging-port，Node 26 自带 WebSocket，够用。

   用法：
     const b = await launch({ headless: true });
     const p = await newPage(b, 'file:///.../index.html');
     await p.waitFor('document.title.length > 0');
     console.log(await p.eval('document.title'));
     await p.shot('tools/_shots/x.png');
     await shutdown(b);
*/

import { spawn } from 'node:child_process';
import http from 'node:http';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const CHROME_CANDIDATES = [
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
  'C:/Program Files/Microsoft/Edge/Application/msedge.exe',
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
];

export function findChrome() {
  for (const p of CHROME_CANDIDATES) if (fs.existsSync(p)) return p;
  throw new Error('没找到 Chrome 或 Edge，检查 CHROME_CANDIDATES');
}

function httpJson(port, p) {
  return new Promise((res, rej) => {
    const req = http.get({ host: '127.0.0.1', port, path: p, timeout: 3000 }, (r) => {
      let d = '';
      r.on('data', (c) => (d += c));
      r.on('end', () => { try { res(JSON.parse(d)); } catch (e) { rej(e); } });
    });
    req.on('error', rej);
    req.on('timeout', () => { req.destroy(); rej(new Error('timeout')); });
  });
}

export async function launch({ port = 9401, headless = true, width = 1440, height = 1400, extraArgs = [] } = {}) {
  const userDir = path.join(os.tmpdir(), 'xiancha-cdp-' + process.pid + '-' + port);
  const args = [
    headless ? '--headless=new' : '--start-maximized',
    '--disable-gpu',
    '--no-first-run',
    '--no-default-browser-check',
    '--disable-extensions',
    '--disable-background-networking',
    '--remote-debugging-port=' + port,
    '--user-data-dir=' + userDir,
    '--window-size=' + width + ',' + height,
    '--allow-file-access-from-files',
    'about:blank',
    ...extraArgs,
  ];
  const proc = spawn(findChrome(), args, { stdio: 'ignore' });
  let up = false;
  for (let i = 0; i < 80 && !up; i++) {
    try { await httpJson(port, '/json/version'); up = true; } catch { await new Promise((r) => setTimeout(r, 200)); }
  }
  if (!up) { try { proc.kill(); } catch {} throw new Error('Chrome 没起来（端口 ' + port + '）'); }

  const ver = await httpJson(port, '/json/version');
  const ws = new WebSocket(ver.webSocketDebuggerUrl);
  await new Promise((r, j) => { ws.addEventListener('open', r, { once: true }); ws.addEventListener('error', j, { once: true }); });

  /* 一条总的消息分发：按 sessionId 分给对应的 page，避免每个 page 挂一个监听器（会触发 MaxListeners 警告） */
  const routers = new Map(); // sessionId -> {pending: Map}
  let seq = 0;
  const rootPending = new Map();
  ws.addEventListener('message', (ev) => {
    const m = JSON.parse(ev.data);
    if (m.id) {
      if (m.sessionId && routers.has(m.sessionId)) {
        const r = routers.get(m.sessionId);
        if (r.pending.has(m.id)) { r.pending.get(m.id)(m); r.pending.delete(m.id); return; }
      }
      if (rootPending.has(m.id)) { rootPending.get(m.id)(m); rootPending.delete(m.id); }
    }
  });

  const rootSend = (method, params = {}) => new Promise((res) => {
    const id = ++seq; rootPending.set(id, res);
    ws.send(JSON.stringify({ id, method, params }));
  });

  return { proc, ws, rootSend, routers, port, userDir, nextId: () => ++seq, baseCheck: ver.Browser };
}

export async function newPage(browser, url) {
  const t = await browser.rootSend('Target.createTarget', { url: 'about:blank' });
  const targetId = t.result.targetId;
  const a = await browser.rootSend('Target.attachToTarget', { targetId, flatten: true });
  const sessionId = a.result.sessionId;

  const pending = new Map();
  browser.routers.set(sessionId, { pending });
  const send = (method, params = {}) => new Promise((res) => {
    const id = browser.nextId(); pending.set(id, res);
    browser.ws.send(JSON.stringify({ id, method, params, sessionId }));
  });

  await send('Page.enable');
  await send('Runtime.enable');
  await send('Emulation.setFocusEmulationEnabled', { enabled: true }).catch(() => {});
  if (url) await send('Page.navigate', { url });

  const page = {
    targetId,
    sessionId,
    send,
    async eval(expression) {
      const r = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
      const d = r.result;
      if (d && d.exceptionDetails) {
        const ex = d.exceptionDetails;
        throw new Error((ex.exception && ex.exception.description) || ex.text || 'eval 失败');
      }
      return d && d.result ? d.result.value : undefined;
    },
    async waitFor(expression, timeout = 10000) {
      const t0 = Date.now();
      while (Date.now() - t0 < timeout) {
        try { if (await page.eval(expression)) return true; } catch { /* 元素还没出来 */ }
        await new Promise((r) => setTimeout(r, 120));
      }
      throw new Error('等不到：' + expression);
    },
    async click(selector) {
      const done = await page.eval(
        '(function(){var e=document.querySelector(' + JSON.stringify(selector) + ');if(!e)return false;e.click();return true})()'
      );
      if (!done) throw new Error('点不到：' + selector);
      await new Promise((r) => setTimeout(r, 250));
    },
    async goto(u) { await send('Page.navigate', { url: u }); await new Promise((r) => setTimeout(r, 200)); },
    async shot(file) {
      const m = await send('Page.getLayoutMetrics');
      const w = Math.ceil(m.result.cssContentSize.width);
      const h = Math.ceil(m.result.cssContentSize.height);
      await send('Emulation.setDeviceMetricsOverride', { width: w, height: h, deviceScaleFactor: 1, mobile: false });
      const s = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: true, clip: { x: 0, y: 0, width: w, height: h, scale: 1 } });
      fs.mkdirSync(path.dirname(file), { recursive: true });
      fs.writeFileSync(file, Buffer.from(s.result.data, 'base64'));
      return { file, width: w, height: h, bytes: fs.statSync(file).size };
    },
    async close() {
      browser.routers.delete(sessionId);
      await browser.rootSend('Target.closeTarget', { targetId });
    },
  };
  if (url) await page.waitFor('document.readyState === "complete"');
  return page;
}

export async function shutdown(browser) {
  try { browser.ws.close(); } catch {}
  try { browser.proc.kill(); } catch {}
  try { await new Promise((r) => setTimeout(r, 300)); fs.rmSync(browser.userDir, { recursive: true, force: true }); } catch {}
}
