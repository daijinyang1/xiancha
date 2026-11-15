// HTTP 小工具：把 Functions 的 Response 构造统一到一处。
//
// 约定（与 Spring 版 ApiExceptionHandler 对齐）：
//  · 成功：200 + application/json; charset=utf-8，正文就是裸对象/数组（前端 asList 也认包装）
//  · 参数错：400 + { "error": "..." }
//  · 找不到：404 + { "error": "not found" }
//  · 内部错：500 + { "error": "..." }
//
// 不返回堆栈，不透出内部路径。

const JSON_HEADERS = {
  'content-type': 'application/json; charset=utf-8',
  // 同源部署（xiancha.pages.dev/api），这里仍显式声明，方便本地 8788 用 curl 之外的方式验证
  'access-control-allow-origin': '*',
  'access-control-allow-headers': 'content-type,accept',
  'access-control-allow-methods': 'GET,POST,OPTIONS',
  // 接口结果都是实时数据，别让 CDN 缓存住
  'cache-control': 'no-store',
}

/** 200 + JSON */
export function json(data, init = {}) {
  return new Response(JSON.stringify(data), {
    status: 200,
    ...init,
    headers: { ...JSON_HEADERS, ...(init.headers || {}) },
  })
}

/** 任意状态码 + JSON */
export function jsonError(message, status = 500) {
  return new Response(JSON.stringify({ error: String(message) }), {
    status,
    headers: JSON_HEADERS,
  })
}

/** 400 */
export function badRequest(message) {
  return jsonError(message, 400)
}

/** 404 */
export function notFound(message = 'not found') {
  return jsonError(message, 404)
}

/** 只允许指定方法，其余回 405（带 Allow 头） */
export function methodNotAllowed(allowed) {
  const allow = Array.isArray(allowed) ? allowed.join(', ') : allowed
  return new Response(JSON.stringify({ error: 'method not allowed, use ' + allow }), {
    status: 405,
    headers: { ...JSON_HEADERS, allow },
  })
}

/**
 * OPTIONS 预检：同源部署用不到，但本机 8788 和以后换域名时需要。
 */
export function preflight() {
  return new Response(null, { status: 204, headers: JSON_HEADERS })
}

/**
 * 读 JSON 请求体。空体当作 {}，解析失败报 400 而不是 500。
 * 上限 128 KB（正文上限由各端点自己再按业务规则卡，scan 是 50000 字符）。
 */
export async function readJson(request, maxBytes = 131072) {
  const text = await request.text()
  if (!text) return {}
  if (text.length > maxBytes) {
    const err = new Error('请求体过大')
    err.status = 413
    throw err
  }
  try {
    const parsed = JSON.parse(text)
    return parsed && typeof parsed === 'object' ? parsed : {}
  } catch {
    const err = new Error('请求体不是合法 JSON')
    err.status = 400
    throw err
  }
}

/**
 * 把 handler 包一层：任何未捕获异常都变成 500 JSON，不许漏出堆栈页。
 * 用法：export const onRequestGet = wrap(async (ctx) => { ... })
 */
export function wrap(handler) {
  return async (context) => {
    // 预检直接放行
    if (context.request.method === 'OPTIONS') return preflight()
    try {
      return await handler(context)
    } catch (e) {
      const status = e && Number.isInteger(e.status) ? e.status : 500
      if (status >= 500) {
        console.error('functions error:', e && (e.stack || e.message || e))
      }
      return jsonError((e && e.message) || 'internal error', status)
    }
  }
}

/** URL 查询参数取字符串，空串归一为 undefined（对齐 Spring 的 trimToNull 语义由调用方处理） */
export function queryParam(url, name) {
  const v = url.searchParams.get(name)
  return v === null ? undefined : v
}
