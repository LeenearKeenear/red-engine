// Shared presentation helpers mirroring the Go template funcs (humanize, etc.)

export function humanize(s) {
  if (!s) return ''
  return s.replace(/[-_]/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
}

// Strip a leading slash for building clean SPA links.
export function clean(path) {
  return (path || '').replace(/^\//, '')
}

// Last path segment, humanized — used when a node has no display_name.
export function lastSegment(path) {
  const parts = clean(path).split('/').filter(Boolean)
  return humanize(parts[parts.length - 1] || '')
}

// Human-readable tunnel label, mirroring router/nodes.go tunnelLabel().
export function tunnelLabel(t) {
  switch (t) {
    case 'cloudflare_quick': return 'Cloudflare Quick'
    case 'cloudflare_named': return 'Cloudflare Named'
    case 'direct':           return 'Direct'
    default:                 return ''
  }
}

// First 16 hex chars of a key, mirroring router/nodes.go shortKey().
export function shortKey(k) {
  if (!k) return ''
  return k.length > 16 ? k.slice(0, 16) : k
}

// Coarse "time ago" from an RFC3339 timestamp, mirroring relativeTime().
export function relativeTime(iso) {
  if (!iso) return 'never'
  const then = new Date(iso).getTime()
  if (Number.isNaN(then)) return 'never'
  const d = Date.now() - then
  const min = 60_000, hr = 60 * min, day = 24 * hr
  if (d < min) return 'just now'
  if (d < hr)  return `${Math.floor(d / min)} min ago`
  if (d < day) return `${Math.floor(d / hr)} hr ago`
  return `${Math.floor(d / day)} days ago`
}
