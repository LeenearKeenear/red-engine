import { Outlet, Link, useNavigate } from 'react-router-dom'
import { useState, useEffect, useRef } from 'react'
import { clean } from '../util.js'

// Fixed navbar + live search, mirroring the <nav> and the search script shared
// by templates/main.html and article.html. The search index is the same
// /-/search-index.json the server already publishes.
export default function RootLayout() {
  const navigate = useNavigate()
  const [index, setIndex] = useState([])
  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])
  const [open, setOpen] = useState(false)
  const inputRef = useRef(null)
  const boxRef = useRef(null)

  // Load the search index once.
  useEffect(() => {
    fetch('/-/search-index.json')
      .then(r => (r.ok ? r.json() : []))
      .then(data => setIndex(Array.isArray(data) ? data : []))
      .catch(() => setIndex([]))
  }, [])

  // ⌘K / Ctrl-K to focus, Escape to dismiss.
  useEffect(() => {
    function onKey(e) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        inputRef.current?.focus()
        inputRef.current?.select()
      }
      if (e.key === 'Escape') {
        setOpen(false)
        inputRef.current?.blur()
      }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [])

  // Click-outside closes the dropdown.
  useEffect(() => {
    function onClick(e) {
      if (boxRef.current && !boxRef.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('click', onClick)
    return () => document.removeEventListener('click', onClick)
  }, [])

  function runSearch(value) {
    setQuery(value)
    const q = value.trim().toLowerCase()
    if (q.length < 2) {
      setResults([])
      setOpen(false)
      return
    }
    const matches = index
      .filter(it =>
        it.title?.toLowerCase().includes(q) || it.path?.toLowerCase().includes(q))
      .slice(0, 10)
    setResults(matches)
    setOpen(true)
  }

  function go(path) {
    setOpen(false)
    setQuery('')
    navigate(`/article/${clean(path)}`)
  }

  return (
    <>
      <nav className="fixed left-0 top-0 z-50 h-16 w-full border-b border-sovereign-hover bg-sovereign text-white shadow-[0_2px_8px_rgba(0,0,0,0.35)]">
        <div className="mx-auto flex h-full max-w-[1400px] items-center justify-between gap-4 px-6">
          <Link to="/" className="whitespace-nowrap font-serif text-[1.625rem] font-bold uppercase tracking-[0.06em] text-white no-underline transition-opacity hover:opacity-80">
            R.E.D. ENGINE
          </Link>

          <div className="relative w-[280px] max-[640px]:w-[180px]" ref={boxRef}>
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={e => runSearch(e.target.value)}
              onFocus={() => { if (results.length) setOpen(true) }}
              placeholder="Search articles…"
              autoComplete="off"
              className="w-full rounded border border-white/25 bg-white/10 py-1.5 pl-3 pr-10 font-sans text-[0.8125rem] text-white outline-none transition placeholder:text-white/50 focus:border-white/55 focus:bg-white/20"
            />
            <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 rounded-[0.2rem] border border-white/20 bg-white/10 px-1.5 py-0.5 font-sans text-[0.65rem] text-white/45 max-[640px]:hidden">⌘K</span>

            {open && (
              <div className="absolute left-0 right-0 top-[calc(100%+6px)] z-[60] max-h-[22rem] overflow-y-auto rounded border border-paper-border bg-paper-white shadow-[0_4px_18px_rgba(0,0,0,0.22)]">
                {results.length === 0 ? (
                  <div className="px-3 py-2.5 font-sans text-sm italic text-ink-muted">No results found</div>
                ) : (
                  results.map(it => (
                    <button
                      key={it.path}
                      onClick={() => go(it.path)}
                      className="block w-full border-b border-paper-border px-3 py-2 text-left font-sans text-sm text-ink-black no-underline transition-colors last:border-b-0 hover:bg-paper-light"
                    >
                      {it.title}
                    </button>
                  ))
                )}
              </div>
            )}
          </div>

          <div className="flex items-center gap-5 max-[640px]:hidden">
            <Link to="/-/nodes" className="font-sans text-sm text-white/85 no-underline transition-opacity hover:opacity-100">Nodes</Link>
            <Link to="/-/admin" className="font-sans text-sm text-white/85 no-underline transition-opacity hover:opacity-100">Admin</Link>
          </div>
        </div>
      </nav>

      <Outlet />
    </>
  )
}
