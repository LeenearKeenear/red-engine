// Branding defaults for the prototype.

// Shown wherever a branch/article lacks a RED_KNOWLEDGE description.
export const DEFAULT_DESCRIPTION = 'Resilient, Encrypted, Decentralized'

// Solid cover-color palette (Imperial Red + formal Teal family). Used as a
// graceful fallback when a branch has no .meta/cover.jpg — never a broken image.
const COVER_COLORS = [
  '#ed2939', // imperial red
  '#0f766e', // formal teal
  '#8e0e1f', // imperial deep
  '#115e59', // teal dark
  '#b81d2c', // imperial dark
  '#134e4a', // teal deep
]

// Deterministically pick a stable cover color from a key (path/name) so the
// same branch always renders the same color across reloads.
export function coverColor(key: string): string {
  let hash = 0
  for (let i = 0; i < key.length; i++) {
    hash = (hash * 31 + key.charCodeAt(i)) | 0
  }
  return COVER_COLORS[Math.abs(hash) % COVER_COLORS.length]
}

// Description with the branded fallback applied.
export function describe(description?: string | null): string {
  const d = (description ?? '').trim()
  return d || DEFAULT_DESCRIPTION
}
