import type { SearchEntry } from '../types/api'
import { getJSON } from './http'

// GET /-/search-index.json → flat [{title, path}] index built from all articles.
export function fetchSearchIndex(): Promise<SearchEntry[]> {
  return getJSON<SearchEntry[]>('/-/search-index.json')
}
