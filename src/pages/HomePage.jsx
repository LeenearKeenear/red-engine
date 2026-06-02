import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { fetchNavigation, fetchRecentFiles } from '../api.js'
import FolderCard from '../components/FolderCard.jsx'
import VerificationBadge from '../components/VerificationBadge.jsx'
import { clean } from '../util.js'

// Top-level hub: vault cards + recently-updated list. Mirrors the hub layout
// in templates/main.html + sub1.html. NOTE: /api/navigation with no path
// returns a FLAT ARRAY of top-level vaults, not a tree node.
export default function HomePage() {
  const [vaults, setVaults] = useState(null)
  const [recent, setRecent] = useState([])
  const [error, setError] = useState(null)

  useEffect(() => {
    Promise.all([fetchNavigation(), fetchRecentFiles(5)])
      .then(([navData, recentData]) => {
        // /api/navigation (no path) returns a FLAT list of every folder; keep
        // only the top-level vaults (paths with no separator) for the hub.
        const all = Array.isArray(navData) ? navData : (navData.children || [])
        setVaults(all.filter(n => !clean(n.path).includes('/')))
        setRecent(Array.isArray(recentData) ? recentData : [])
      })
      .catch(err => setError(err.message))
  }, [])

  if (error) return <ErrorState message={error} />
  if (!vaults) return <div className="loading-state mt-16 p-10 text-center text-ink-muted">Loading…</div>

  return (
    <main className="mt-16 min-h-[calc(100vh-4rem)] bg-paper-white px-8 py-10 max-[768px]:px-4">
      <div className="mx-auto max-w-[1140px]">
        <h1 className="mb-6 font-serif text-[2.5rem] font-bold leading-[1.2] text-ink-black">Knowledge Vaults</h1>

        {vaults.length > 0 ? (
          <div className="mb-12 grid grid-cols-[repeat(auto-fill,minmax(260px,1fr))] gap-5">
            {vaults.map(v => <FolderCard key={v.path} node={v} />)}
          </div>
        ) : (
          <p className="mb-12 italic text-ink-muted">No vaults available yet.</p>
        )}

        {recent.length > 0 && (
          <section>
            <h2 className="mb-4 font-serif text-[1.6rem] font-bold text-ink-black">Recently Updated</h2>
            <div>
              {recent.map(item => (
                <Link
                  key={item.path}
                  to={`/article/${clean(item.path)}`}
                  className="mb-2 flex items-center justify-between gap-4 rounded border border-paper-border bg-white px-[1.125rem] py-3.5 no-underline transition-colors hover:border-paper-hover hover:bg-paper-light"
                >
                  <div className="flex min-w-0 flex-1 items-center gap-2.5">
                    <span className="truncate font-serif text-[1.2rem] font-semibold text-ink-black">{item.title}</span>
                    {item.verification_state === 'verified' && (
                      <span className="shrink-0 rounded-[0.2rem] border border-[#86efac] bg-[#f0fdf4] px-1.5 py-0.5 font-sans text-[0.65rem] font-bold text-[#15803d]">✓</span>
                    )}
                    {item.author && (
                      <span className="shrink-0 font-sans text-xs text-ink-muted">by {item.author}</span>
                    )}
                  </div>
                  <span className="shrink-0 font-bold text-sovereign">→</span>
                </Link>
              ))}
            </div>
          </section>
        )}
      </div>
    </main>
  )
}

function ErrorState({ message }) {
  return (
    <main className="mt-16 p-10">
      <div className="mx-auto max-w-[680px] rounded border border-[#fca5a5] bg-[#fff1f2] px-5 py-4 font-sans text-sm text-[#b91c1c]">
        {message}
      </div>
    </main>
  )
}
