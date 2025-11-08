// Minimal HTML sanitizer for server-side usage without external deps.
// WARNING: This is a conservative sanitizer removing script/style/iframe/object/embed and JS URLs,
// and strips on* event handlers. For production-grade sanitization, consider using `sanitize-html`.

export function sanitizeHtml(input: string | null | undefined): string | null {
  if (!input) return input ?? null
  let html = String(input)
  // Remove script/style/iframe/object/embed tags entirely
  html = html.replace(/<\/(?:script|style|iframe|object|embed)>/gi, '')
  html = html.replace(/<(?:script|style|iframe|object|embed)[^>]*>[\s\S]*?<\/(?:script|style|iframe|object|embed)>/gi, '')
  // Remove on* event handler attributes (e.g., onclick="...", onload='...')
  html = html.replace(/\son[a-z]+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, '')
  // Neutralize javascript: URLs in href/src
  html = html.replace(/(href|src)\s*=\s*(["'])\s*javascript:[^"']*\2/gi, '$1="#"')
  html = html.replace(/(href|src)\s*=\s*javascript:[^\s>]+/gi, '$1="#"')
  // Remove meta refresh
  html = html.replace(/<meta[^>]*http-equiv\s*=\s*("|')?refresh\1?[^>]*>/gi, '')
  return html
}
