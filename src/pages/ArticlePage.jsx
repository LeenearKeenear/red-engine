import { useState, useEffect } from 'react'
import { useLocation, Link } from 'react-router-dom'
import { fetchContent, fetchNavigation } from '../api.js'
import Sidebar from '../components/Sidebar.jsx'
import VerificationBadge from '../components/VerificationBadge.jsx'
import { clean } from '../util.js'

// The reader. Mirrors templates/article.html: scoped sidebar, breadcrumbs,
// title + verification badge, sanitized prose body, prev/next, hash footer.
export default function ArticlePage() {
  const location = useLocation()
  const contentPath = location.pathname.replace(/^\/article/, '') || '/'

  const [article, setArticle] = useState(null)
  const [topNav, setTopNav] = useState(null)
  const [error, setError] = useState(null)

  useEffect(() => {
    setArticle(null)
    setError(null)
    const topSection = clean(contentPath).split('/').filter(Boolean)[0] || ''
    const navPromise = topSection ? fetchNavigation(topSection) : Promise.resolve(null)
    Promise.all([fetchContent(contentPath), navPromise])
      .then(([art, nav]) => {
        setArticle(art)
        setTopNav(nav)
      })
      .catch(err => setError(err.message))
  }, [contentPath])

  if (error) return <ErrorState message={error} />
  if (!article) return <div className="loading-state mt-16 p-10 text-center text-ink-muted">Loading…</div>

  const hasSidebar = !!topNav
  const currentPath = '/' + clean(contentPath)

  return (
    <>
      {hasSidebar && <Sidebar nav={topNav} activePath={contentPath} />}

      <main className={`${hasSidebar ? 'ml-[260px] max-[768px]:ml-[220px] max-[640px]:ml-0 ' : ''}mt-16 min-h-[calc(100vh-4rem)] bg-paper-white px-8 py-10 max-[768px]:px-4`}>
        <div className="mx-auto max-w-[820px]">
          {article.crumb && article.crumb.length > 0 && (
            <div className="mb-6 flex flex-wrap items-center gap-1.5 font-sans text-[0.8125rem] font-medium text-ink-muted [&_a]:whitespace-nowrap">
              <Link to="/" className="text-ink-muted no-underline transition-colors hover:text-sovereign">Home</Link>
              {article.crumb.map(c => (
                <span key={c.path} className="flex items-center gap-1.5">
                  <span className="text-paper-border">/</span>
                  {c.path === currentPath ? (
                    <span className="text-ink-mid">{c.label}</span>
                  ) : (
                    <Link to={c.path} className="text-ink-muted no-underline transition-colors hover:text-sovereign">{c.label}</Link>
                  )}
                </span>
              ))}
            </div>
          )}

          <div className="mb-0 flex flex-wrap items-baseline gap-3">
            <h1 className="mb-2 max-w-full shrink-0 font-serif text-[2.5rem] font-bold leading-[1.2] text-ink-black">{article.title}</h1>
            <span className="mt-2">
              <VerificationBadge state={article.verification_state} author={article.author} />
            </span>
          </div>

          <article
            className="prose-red mt-7"
            dangerouslySetInnerHTML={{ __html: article.body_html }}
          />

          {(article.prev_article || article.next_article) && (
            <nav className="mt-12 flex items-stretch gap-4 border-t border-paper-border pt-6">
              {article.prev_article && (
                <Link
                  to={`/article/${clean(article.prev_article.path)}`}
                  className="flex max-w-[48%] flex-col rounded border border-paper-border bg-paper-white px-[1.125rem] py-3.5 no-underline transition-colors hover:border-paper-hover hover:bg-paper-light"
                >
                  <span className="mb-1 font-sans text-[0.65rem] font-bold uppercase tracking-[0.1em] text-ink-muted">← Previous</span>
                  <span className="font-serif text-[1.075rem] font-semibold leading-[1.35] text-sovereign">{article.prev_article.title}</span>
                </Link>
              )}
              {article.next_article && (
                <Link
                  to={`/article/${clean(article.next_article.path)}`}
                  className="ml-auto flex max-w-[48%] flex-col rounded border border-paper-border bg-paper-white px-[1.125rem] py-3.5 text-right no-underline transition-colors hover:border-paper-hover hover:bg-paper-light"
                >
                  <span className="mb-1 font-sans text-[0.65rem] font-bold uppercase tracking-[0.1em] text-ink-muted">Next →</span>
                  <span className="font-serif text-[1.075rem] font-semibold leading-[1.35] text-sovereign">{article.next_article.title}</span>
                </Link>
              )}
            </nav>
          )}

          {article.hash && (
            <div className="mt-16 border-t border-paper-border pt-6">
              <div className="flex flex-wrap items-center justify-between gap-3 rounded border border-paper-border bg-paper-light px-4 py-3.5">
                <div className="flex items-center gap-1.5 text-ink-muted">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" className="h-[1.125rem] w-[1.125rem]">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 7H7a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2V9a2 2 0 00-2-2h-2M9 7V5a2 2 0 012-2h2a2 2 0 012 2v2M9 7h6" />
                  </svg>
                  <span className="font-sans text-[0.6875rem] font-bold uppercase tracking-[0.1em]">SHA-256</span>
                </div>
                <code className="break-all rounded-[0.2rem] border border-paper-border bg-paper-white px-2 py-0.5 font-mono text-xs text-ink-muted">{article.hash}</code>
              </div>
            </div>
          )}
        </div>
      </main>
    </>
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
