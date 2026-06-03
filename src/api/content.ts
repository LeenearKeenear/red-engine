import type { Article, RecentFile } from '../types/api'
import { getJSON } from './http'
import { withLeadingSlash } from './paths'

// GET /api/content?path=<path> → article or directory-default (RED_KNOWLEDGE).
export function fetchArticle(path: string): Promise<Article> {
  const p = withLeadingSlash(path)
  return getJSON<Article>(`/api/content?path=${encodeURIComponent(p)}`)
}

// GET /api/recent-files?limit=N → most recently modified articles.
export function fetchRecentFiles(limit = 5): Promise<RecentFile[]> {
  return getJSON<RecentFile[]>(`/api/recent-files?limit=${limit}`)
}
