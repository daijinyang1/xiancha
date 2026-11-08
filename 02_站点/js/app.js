/* 先查 · 公共交互
 * 这里只放"多个页面都要用"的东西：导航高亮、提示条、数据导出/导入、收藏读写。
 * 不依赖任何第三方库，也不发任何网络请求。
 */
(function (global) {
  'use strict';

  var Store = global.QZQStore;

  /* ---------- 小工具 ---------- */

  function $(sel, root) { return (root || document).querySelector(sel); }
  function $$(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }

  function esc(str) {
    return String(str == null ? '' : str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  var toastTimer = null;
  function toast(msg) {
    var el = $('#toast');
    if (!el) {
      el = document.createElement('div');
      el.id = 'toast';
      el.className = 'toast';
      document.body.appendChild(el);
    }
    el.textContent = msg;
    el.classList.add('show');
    if (toastTimer) clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { el.classList.remove('show'); }, 2400);
  }

  function download(filename, text, mime) {
    try {
      var blob = new Blob([text], { type: (mime || 'text/plain') + ';charset=utf-8' });
      var url = URL.createObjectURL(blob);
      var a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(function () { URL.revokeObjectURL(url); }, 1500);
      return true;
    } catch (e) {
      toast('当前浏览器不支持直接下载，请手动复制内容');
      return false;
    }
  }

  function copyText(text) {
    if (navigator.clipboard && navigator.clipboard.writeText && window.isSecureContext) {
      return navigator.clipboard.writeText(text);
    }
    return new Promise(function (resolve, reject) {
      try {
        var ta = document.createElement('textarea');
        ta.value = text;
        ta.setAttribute('readonly', 'readonly');
        ta.style.position = 'fixed';
        ta.style.top = '-1000px';
        document.body.appendChild(ta);
        ta.select();
        ta.setSelectionRange(0, ta.value.length);
        var ok = document.execCommand('copy');
        document.body.removeChild(ta);
        ok ? resolve() : reject(new Error('copy failed'));
      } catch (e) { reject(e); }
    });
  }

  function fmtTime(d) {
    function p(n) { return n < 10 ? '0' + n : '' + n; }
    return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate()) + ' ' + p(d.getHours()) + ':' + p(d.getMinutes());
  }

  /* ---------- 导航高亮 ---------- */

  function markNav() {
    var file = (location.pathname.split('/').pop() || 'index.html').toLowerCase();
    if (file === '') file = 'index.html';
    $$('.nav a').forEach(function (a) {
      var href = (a.getAttribute('href') || '').toLowerCase();
      a.classList.toggle('active', href === file);
    });
  }

  /* ---------- 收藏（避坑库） ---------- */

  function getFavs() {
    var list = Store.get('traps.favs', []);
    return Array.isArray(list) ? list : [];
  }

  function isFav(id) {
    return getFavs().indexOf(id) !== -1;
  }

  function toggleFav(id) {
    var list = getFavs();
    var idx = list.indexOf(id);
    if (idx === -1) list.push(id); else list.splice(idx, 1);
    Store.set('traps.favs', list);
    return idx === -1;
  }

  /* ---------- 数据导出 / 导入 ---------- */

  function exportData() {
    var payload = Store.exportAll();
    payload.exportedAtText = fmtTime(new Date());
    var name = '先查-本地数据备份.json';
    if (download(name, JSON.stringify(payload, null, 2), 'application/json')) {
      toast('已导出：' + name);
    }
  }

  function importDataFromFile(file) {
    var reader = new FileReader();
    reader.onload = function () {
      var res = Store.importAll(String(reader.result || ''));
      if (!res.ok) { toast('导入失败：' + res.message); return; }
      toast('已导入 ' + res.count + ' 项数据');
      setTimeout(function () { location.reload(); }, 700);
    };
    reader.onerror = function () { toast('读取文件失败'); };
    reader.readAsText(file, 'utf-8');
  }

  function clearAllData() {
    if (!global.confirm('确定清空本机保存的全部数据吗？（收藏、扫描记录、AI 设置）此操作不可撤销。')) return;
    var n = Store.clearAll();
    toast('已清空 ' + n + ' 项本地数据');
    setTimeout(function () { location.reload(); }, 700);
  }

  /* ---------- 启动 ---------- */

  function init() {
    markNav();

    var expBtn = $('#btn-export');
    if (expBtn) expBtn.addEventListener('click', exportData);

    var impInput = $('#input-import');
    if (impInput) {
      impInput.addEventListener('change', function () {
        if (impInput.files && impInput.files[0]) importDataFromFile(impInput.files[0]);
        impInput.value = '';
      });
    }
    var impBtn = $('#btn-import');
    if (impBtn && impInput) impBtn.addEventListener('click', function () { impInput.click(); });

    var clearBtn = $('#btn-clear-all');
    if (clearBtn) clearBtn.addEventListener('click', clearAllData);

    if (!Store.available) {
      var tip = document.createElement('div');
      tip.className = 'notice notice-amber';
      tip.style.margin = '0 0 12px';
      tip.innerHTML = '<strong>提示：</strong>当前浏览器禁用了本地存储，本次记录关掉页面后会丢失。如果用的是无痕窗口，换成普通窗口即可正常保存。';
      var main = $('main .wrap') || $('main');
      if (main) main.insertBefore(tip, main.firstChild);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  global.QZQApp = {
    $: $, $$: $$, esc: esc, toast: toast, download: download, copyText: copyText,
    fmtTime: fmtTime, getFavs: getFavs, isFav: isFav, toggleFav: toggleFav,
    exportData: exportData, clearAllData: clearAllData
  };
})(window);
