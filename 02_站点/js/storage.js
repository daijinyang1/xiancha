/* 先查 · localStorage 封装
 * 所有键统一加前缀 xc.
 * 浏览器禁用存储时自动降级为内存对象，页面仍可用，只是刷新后丢失。
 */
(function (global) {
  'use strict';

  var PREFIX = 'xc.';
  var memory = {};
  var available = true;

  try {
    var probe = PREFIX + '__probe__';
    global.localStorage.setItem(probe, '1');
    global.localStorage.removeItem(probe);
  } catch (e) {
    available = false;
  }

  /* 老版本前缀 qzq.（站名「签字前」时期）→ 新前缀 xc.
     第一次打开时把旧键原样搬过来，用户之前收藏的案例和存的 Key 不会丢。只搬一次，搬完打标记。 */
  (function migrateLegacy() {
    var LEGACY = 'qzq.';
    var FLAG = 'xc.__migrated__';
    if (!available) return;
    try {
      if (global.localStorage.getItem(FLAG)) return;
      var moved = 0;
      for (var i = 0; i < global.localStorage.length; i++) {
        var k = global.localStorage.key(i);
        if (!k || k.indexOf(LEGACY) !== 0) continue;
        var nk = PREFIX + k.slice(LEGACY.length);
        if (global.localStorage.getItem(nk) === null) {
          global.localStorage.setItem(nk, global.localStorage.getItem(k));
          moved++;
        }
      }
      global.localStorage.setItem(FLAG, String(moved));
    } catch (e) {}
  })();

  function full(key) {
    return key.indexOf(PREFIX) === 0 ? key : PREFIX + key;
  }

  function get(key, fallback) {
    var k = full(key);
    try {
      var raw = available ? global.localStorage.getItem(k) : memory[k];
      if (raw === null || raw === undefined) return fallback;
      return JSON.parse(raw);
    } catch (e) {
      return fallback;
    }
  }

  function set(key, value) {
    var k = full(key);
    var raw = JSON.stringify(value);
    try {
      if (available) global.localStorage.setItem(k, raw);
      else memory[k] = raw;
      return true;
    } catch (e) {
      memory[k] = raw;
      return false;
    }
  }

  function remove(key) {
    var k = full(key);
    try {
      if (available) global.localStorage.removeItem(k);
    } catch (e) {}
    delete memory[k];
  }

  function keys() {
    var out = [];
    if (!available) {
      for (var m in memory) if (Object.prototype.hasOwnProperty.call(memory, m)) out.push(m);
      return out;
    }
    try {
      for (var i = 0; i < global.localStorage.length; i++) {
        var k = global.localStorage.key(i);
        if (k && k.indexOf(PREFIX) === 0) out.push(k);
      }
    } catch (e) {}
    return out;
  }

  function exportAll() {
    var data = {};
    var list = keys();
    for (var i = 0; i < list.length; i++) {
      data[list[i]] = get(list[i], null);
    }
    return {
      app: '先查',
      version: 1,
      exportedAt: new Date().toISOString(),
      data: data
    };
  }

  function importAll(payload) {
    var obj = payload;
    if (typeof payload === 'string') {
      try { obj = JSON.parse(payload); } catch (e) { return { ok: false, message: '内容不是合法的 JSON' }; }
    }
    if (!obj || typeof obj !== 'object' || !obj.data || typeof obj.data !== 'object') {
      return { ok: false, message: '文件格式不对，找不到 data 字段' };
    }
    var count = 0;
    for (var k in obj.data) {
      if (!Object.prototype.hasOwnProperty.call(obj.data, k)) continue;
      if (k.indexOf(PREFIX) !== 0) continue;
      set(k, obj.data[k]);
      count++;
    }
    return { ok: true, count: count };
  }

  function clearAll() {
    var list = keys();
    for (var i = 0; i < list.length; i++) remove(list[i]);
    return list.length;
  }

  global.QZQStore = {
    available: available,
    prefix: PREFIX,
    get: get,
    set: set,
    remove: remove,
    keys: keys,
    exportAll: exportAll,
    importAll: importAll,
    clearAll: clearAll
  };
})(window);
