import { useState, useEffect } from 'react'
import { useNavigate, useLocation, Link } from 'react-router-dom'
import { fetchNavigation } from '../api.js'
import FolderCard from '../components/FolderCard.jsx'
import { clean, humanize } from '../util.js'

// Second-level hub: sub-folder cards + a direct article list with verify
// badges. Mirrors templates/sub1.html. A leaf node redirects to the reader.
export default function SectionBrowser() {
  const location = useLocation()
  const navigate = useNavigate()
  const path = '/' + clean(location.pathname)

  const [nav, setNav] = useState(null)
  const [error, setError] = useState(null)

  useEffect(() => {
    setNav(null)
    setError(null)
    fetchNavigation(path)
      .then(data => {
        if (data.is_leaf) {
          navigate(`/article/${clean(path)}`, { replace: true })
          return
        }
        setNav(data)
      })
      .catch(err => {
        if (err.status === 404) {
          navigate(`/article/${clean(path)}`, { replace: true })
        } else {
          setError(err.message)
        }
      })
  }, [path])

  if (error) return <ErrorState message={error} />
  if (!nav) return <div className="loading-state mt-16 p-10 text-center text-ink-muted">Loading…</div>

  const children = nav.children || []
  const subFolders = children.filter(c => !c.is_leaf)
  const articles = children.filter(c => c.is_leaf)
  const crumbs = buildCrumbs(path)
  const title = nav.display_name || humanize(clean(path).split('/').pop())

  return (
    <main className="mt-16 min-h-[calc(100vh-4rem)] bg-paper-white px-8 py-10 max-[768px]:px-4 max-[768px]:py-6">
      <div className="mx-auto max-w-[1140px]">
        <div className="mb-6 flex flex-wrap items-center gap-1.5 font-sans text-[0.8125rem] font-medium text-ink-muted [&_a]:whitespace-nowrap">
          <Link to="/" className="text-ink-muted no-underline transition-colors hover:text-sovereign">Home</Link>
          {crumbs.map((c, i) => (
            <span key={c.path} className="flex items-center gap-1.5">
              <span className="text-paper-border">/</span>
              {i === crumbs.length - 1 ? (
                <span className="text-ink-mid">{c.label}</span>
              ) : (
                <Link to={c.path} className="text-ink-muted no-underline transition-colors hover:text-sovereign">{c.label}</Link>
              )}
            </span>
          ))}
        </div>

        <h1 className="mb-6 font-serif text-[2.5rem] font-bold leading-[1.2] text-ink-black">{title}</h1>

        {nav.description && (
          <p className="mb-6 max-w-2xl font-serif text-[1rem] italic leading-[1.6] text-ink-mid">{nav.description}</p>
        )}

        {subFolders.length > 0 && (
          <div className="mb-8 grid grid-cols-[repeat(auto-fill,minmax(260px,1fr))] gap-5">
            {subFolders.map(c => <FolderCard key={c.path} node={c} />)}
          </div>
        )}

        {articles.length > 0 && (
          <div className="mt-6">
            {articles.map(a => (
              <Link
                key={a.path}
                to={`/article/${clean(a.path)}`}
                className="mb-2 flex items-center justify-between gap-4 rounded border border-paper-border bg-white px-[1.125rem] py-3.5 no-underline transition-colors hover:border-paper-hover hover:bg-paper-light"
              >
                <div className="flex min-w-0 flex-1 items-center gap-2.5">
                  <span className="font-serif text-[1.2rem] font-semibold text-ink-black">
                    {a.display_name || humanize(clean(a.path).split('/').pop())}
                  </span>
                </div>
                <span className="shrink-0 font-bold text-sovereign">→</span>
              </Link>
            ))}
          </div>
        )}

        {subFolders.length === 0 && articles.length === 0 && (
          <p className="mt-8 italic text-ink-muted">No content yet.</p>
        )}
      </div>
    </main>
  )
}

function buildCrumbs(path) {
  const parts = clean(path).split('/').filter(Boolean)
  return parts.map((part, i) => ({
    label: humanize(part),
    path: '/' + parts.slice(0, i + 1).join('/'),
  }))
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
