import type { NavNode } from '../types/api'
import { getJSON } from './http'
import { stripLeadingSlash } from './paths'

// GET /api/navigation  (no path) → flat array of top-level branch nodes.
export async function fetchTopLevel(): Promise<NavNode[]> {
  return (await getJSON<NavNode[] | null>('/api/navigation')) ?? []
}

// GET /api/navigation?path=<branch> → subtree rooted at <branch> (single node
// with nested children). The path must NOT carry a leading slash.
export function fetchSubtree(path: string): Promise<NavNode> {
  const p = stripLeadingSlash(path)
  return getJSON<NavNode>(`/api/navigation?path=${encodeURIComponent(p)}`)
}

// GET /api/navigation?path=<branch>&flat=1 → flat list of descendants.
export async function fetchFlat(path = ''): Promise<NavNode[]> {
  const p = stripLeadingSlash(path)
  const q = p ? `?path=${encodeURIComponent(p)}&flat=1` : '?flat=1'
  return (await getJSON<NavNode[] | null>(`/api/navigation${q}`)) ?? []
}
