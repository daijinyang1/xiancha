/* tools/cdp_func.mjs —— 交互功能验收 */
import fs from 'node:fs';
import path from 'node:path';
import { launch, newPage, shutdown } from './cdp.mjs';

const BASE = process.argv[2] || 'http://127.0.0.1:3000';
const SHOT_DIR = path.resolve(process.cwd(), 'web/_shots');
fs.mkdirSync(SHOT_DIR, { recursive: true });

const browser = await launch({ headless: true, width: 1440, height: 1200 });
const out = [];
const log = (ok, name, detail) => { out.push({ ok, name, detail }); console.log((ok ? 'PASS ' : 'FAIL ') + name + (detail ? ' | ' + detail : '')); };

const IGNORE = [/Download the Vue Devtools/i, /favicon/i, /ERR_CONNECTION_REFUSED/i, /127\.0\.0\.1:8080/i, /Failed to load resource/i, /net::ERR/i];
function watch(page, bag) {
  const on = (ev) => {
    const m = JSON.parse(ev.data);
    if (m.sessionId !== page.sessionId) return;
    if (m.method === 'Runtime.consoleAPICalled' && (m.params.type === 'error' || m.params.type === 'assert')) {
      const t = (m.params.args || []).map((a) => a.value ?? a.description ?? '').join(' ');
      if (!IGNORE.some((re) => re.test(t))) bag.push('[console] ' + t);
    } else if (m.method === 'Runtime.exceptionThrown') {
      const d = m.params.exceptionDetails || {};
      const t = String((d.exception && (d.exception.description || d.exception.value)) || d.text || '');
      if (!IGNORE.some((re) => re.test(t))) bag.push('[exception] ' + t);
    }
  };
  browser.ws.addEventListener('message', on);
  return () => browser.ws.removeEventListener('message', on);
}
const clickByText = (kw) => '(function(){var b=[].slice.call(document.querySelectorAll("button")).find(function(x){return x.innerText.indexOf("' + kw + '")>=0});if(!b)return false;b.click();return true;})()';
const setInput = (sel, val, evt) => '(function(){var i=document.querySelector("' + sel + '");if(!i)return false;var s=Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype,"value").set;s.call(i,"' + val + '");i.dispatchEvent(new Event("' + (evt || 'input') + '",{bubbles:true}));return true;})()';

// ---------- 1. 扫描 ----------
{
  const errs = [];
  const page = await newPage(browser, 'about:blank');
  const off = watch(page, errs);
  await page.send('Page.navigate', { url: BASE + '/scan' });
  await page.waitFor('document.readyState === "complete"', 15000);
  await page.waitFor('!!document.querySelector("textarea")', 15000);
  await page.eval(clickByText('填入示例合同'));
  await new Promise((r) => setTimeout(r, 400));
  const len = await page.eval('document.querySelector("textarea").value.length');
  await page.eval(clickByText('开始扫描'));
  await page.waitFor('document.querySelectorAll("aside article").length > 0', 25000);
  await new Promise((r) => setTimeout(r, 900));
  const res = await page.eval('(function(){var arts=[].slice.call(document.querySelectorAll("aside article"));var m=document.querySelector("aside");var links=arts.length?[].filter.call(arts[0].querySelectorAll("a"),function(a){return a.getAttribute("href").indexOf("/rules/")===0}).length:0;var txt=m.innerText.replace(/\\s+/g," ");return {hits:arts.length,text:txt.slice(0,200),links:links,hasScore:/风险分|风险等级/.test(txt)};})()');
  const shot = await page.shot(path.join(SHOT_DIR, 'scan-result.png'));
  off(); await page.close();
  log(len > 200 && res.hits > 0 && res.links > 0 && res.hasScore && errs.length === 0, '扫描页：示例合同 → 风险概览 + 按句卡片',
    '输入 ' + len + ' 字，命中 ' + res.hits + ' 句，首卡规则链 ' + res.links + ' 条，截图 ' + Math.round(shot.bytes / 1024) + 'KB' + (errs.length ? ' 错误:' + errs.join(' || ') : ''));
  console.log('       概览文案: ' + res.text);
}

// ---------- 2. 规则三重筛选 ----------
{
  const errs = [];
  const page = await newPage(browser, 'about:blank');
  const off = watch(page, errs);
  await page.send('Page.navigate', { url: BASE + '/rules' });
  await page.waitFor('document.readyState === "complete"', 15000);
  await page.waitFor('document.querySelectorAll("article").length > 50', 20000);
  const total = await page.eval('document.querySelectorAll("article").length');
  await page.eval(setInput('input[type=search]', '押金'));
  await new Promise((r) => setTimeout(r, 700));
  const afterQ = await page.eval('document.querySelectorAll("article").length');
  await page.eval(setInput('input[type=search]', ''));
  await new Promise((r) => setTimeout(r, 400));
  await page.eval(clickByText('押金类'));
  await new Promise((r) => setTimeout(r, 700));
  const afterType = await page.eval('document.querySelectorAll("article").length');
  await page.eval(clickByText('高风险'));
  await new Promise((r) => setTimeout(r, 700));
  const afterLevel = await page.eval('document.querySelectorAll("article").length');
  const shot = await page.shot(path.join(SHOT_DIR, 'rules-filtered.png'));
  off(); await page.close();
  log(total === 63 && afterQ > 0 && afterQ < 63 && afterType === 7 && afterLevel === 5 && errs.length === 0,
    '规则页：全量 63 → 搜「押金」→ 押金类 7 → 加高风险 5',
    'total=' + total + ' 搜索=' + afterQ + ' 类型=' + afterType + ' 等级=' + afterLevel + (errs.length ? ' 错误:' + errs.join(' || ') : ''));
}

// ---------- 3. 案例展开 ----------
{
  const errs = [];
  const page = await newPage(browser, 'about:blank');
  const off = watch(page, errs);
  await page.send('Page.navigate', { url: BASE + '/traps?type=' + encodeURIComponent('押金类') });
  await page.waitFor('document.readyState === "complete"', 15000);
  await page.waitFor('document.querySelectorAll("article").length > 0', 20000);
  await new Promise((r) => setTimeout(r, 800));
  const before = await page.eval('document.querySelector("article").innerText.length');
  await page.eval('(function(){var b=document.querySelector("article button");if(!b)return false;b.click();return true;})()');
  await new Promise((r) => setTimeout(r, 600));
  const after = await page.eval('document.querySelector("article").innerText.length');
  const ruleLinks = await page.eval('(function(){return [].filter.call(document.querySelectorAll("article a"),function(a){return a.getAttribute("href").indexOf("/rules/")===0}).length;})()');
  const shot = await page.shot(path.join(SHOT_DIR, 'traps-expanded.png'));
  off(); await page.close();
  log(after > before + 80 && ruleLinks > 0 && errs.length === 0, '案例页：?type= 筛选 + 展开详情 + 链规则',
    '展开前 ' + before + ' 字 → 展开后 ' + after + ' 字，规则链 ' + ruleLinks + ' 条' + (errs.length ? ' 错误:' + errs.join(' || ') : ''));
}

// ---------- 4. 证书页 ----------
{
  const errs = [];
  const page = await newPage(browser, 'about:blank');
  const off = watch(page, errs);
  await page.send('Page.navigate', { url: BASE + '/certs' });
  await page.waitFor('document.readyState === "complete"', 15000);
  await page.waitFor('document.querySelectorAll("input[type=date]").length >= 6', 20000);
  const rows = await page.eval('document.querySelectorAll("tbody tr").length');
  const dateInputs = await page.eval('document.querySelectorAll("input[type=date]").length');
  await page.eval(setInput('input[type=date]', '2026-12-20', 'change'));
  await new Promise((r) => setTimeout(r, 700));
  const stored = await page.eval('localStorage.getItem("xc.certDates")');
  const bodyTxt = await page.eval('document.querySelector("main").innerText.replace(/\s+/g," ").slice(0,300)');
  const shot = await page.shot(path.join(SHOT_DIR, 'certs-countdown.png'));
  off(); await page.close();
  log(rows === 6 && dateInputs === 6 && !!stored && errs.length === 0, '证书页：6 行 + 6 日期框 + 本机倒计时',
    '表格行 ' + rows + '，日期框 ' + dateInputs + '，localStorage=' + String(stored).slice(0, 30) + (errs.length ? ' 错误:' + errs.join(' || ') : ''));
}

// ---------- 5. 移动端 ----------
{
  const errs = [];
  const page = await newPage(browser, 'about:blank');
  const off = watch(page, errs);
  await page.send('Emulation.setDeviceMetricsOverride', { width: 375, height: 812, deviceScaleFactor: 2, mobile: true });
  await page.send('Page.navigate', { url: BASE + '/' });
  await page.waitFor('document.readyState === "complete"', 15000);
  await page.waitFor('document.querySelector("main").innerText.length > 100', 15000);
  await new Promise((r) => setTimeout(r, 900));
  const m = await page.eval('(function(){return {scrollW:document.documentElement.scrollWidth,clientW:document.documentElement.clientWidth};})()');
  const shot = await page.shot(path.join(SHOT_DIR, 'mobile-home.png'));
  off(); await page.close();
  log(m.scrollW <= m.clientW + 2 && errs.length === 0, '移动端 375px：无横向溢出',
    'scrollWidth=' + m.scrollW + ' clientWidth=' + m.clientW + '，截图 ' + Math.round(shot.bytes / 1024) + 'KB ' + shot.width + 'x' + shot.height + (errs.length ? ' 错误:' + errs.join(' || ') : ''));
}

await shutdown(browser);
const fail = out.filter((o) => !o.ok);
console.log('');
console.log('=== 交互验收 ' + (out.length - fail.length) + '/' + out.length + ' ===');
fs.writeFileSync(path.join(SHOT_DIR, 'report-func.json'), JSON.stringify(out, null, 2), 'utf8');
process.exit(fail.length ? 1 : 0);