async function req(url, opts = {}) {
  const res = await fetch(url, opts)
  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw Object.assign(new Error(text || res.statusText), { status: res.status })
  }
  return res.json()
}

export function fetchNavigation(path = '', flat = false) {
  const params = new URLSearchParams()
  const cleanPath = path.replace(/^\//, '')
  if (cleanPath) params.set('path', cleanPath)
  if (flat) params.set('flat', '1')
  const qs = params.toString()
  return req(`/api/navigation${qs ? '?' + qs : ''}`)
}

export function fetchContent(path) {
  return req(`/api/content?path=${encodeURIComponent(path)}`)
}

export function fetchRecentFiles(limit = 5) {
  return req(`/api/recent-files?limit=${limit}`)
}

export function fetchNodeInfo() {
  return req('/-/nodeinfo')
}

export function fetchPeers() {
  return req('/-/peers')
}

export function verifyAdminToken(token) {
  return req('/-/admin/verify', {
    headers: { 'X-Admin-Token': token },
  })
}

// Raw admin request — returns the Response so callers can branch on .ok and
// read either JSON or text (the import endpoint returns plain text).
export function adminRequest(endpoint, { method = 'GET', body, token = '' } = {}) {
  const headers = { 'X-Admin-Token': token }
  if (body !== undefined) headers['Content-Type'] = 'application/json'
  return fetch(endpoint, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  })
}
