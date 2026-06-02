// Path normalisation helpers. The backend is inconsistent about leading slashes
// across endpoints, so we normalise at the edges.

// Strip a leading slash — used for /api/navigation?path= which expects "a/b".
export function stripLeadingSlash(path: string): string {
  return path.replace(/^\/+/, '')
}

// Ensure a single leading slash — used for RouterLink targets and /api/content.
export function withLeadingSlash(path: string): string {
  const trimmed = path.replace(/^\/+/, '')
  return '/' + trimmed
}

// The top-level branch root segment of a path, with a leading slash.
// "/physics/mechanics/intro" -> "/physics"   ""/"/" -> ""
export function branchRoot(path: string): string {
  const seg = stripLeadingSlash(path).split('/').filter(Boolean)[0]
  return seg ? '/' + seg : ''
}
