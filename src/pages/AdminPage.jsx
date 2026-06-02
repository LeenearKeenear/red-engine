import { useState, useEffect, useCallback } from 'react'
import { verifyAdminToken, adminRequest, fetchNodeInfo } from '../api.js'

const TOKEN_KEY = 'red_admin_token'

// Node administration dashboard. Mirrors templates/admin.html as a single
// scrolling panel: status HUD, node identity, contributors, peers, import,
// and startup sync sources — wired to the real /-/admin/* endpoints.
export default function AdminPage() {
  const [token, setToken] = useState(() => localStorage.getItem(TOKEN_KEY) || '')
  const [authed, setAuthed] = useState(false)
  const [checking, setChecking] = useState(true)

  useEffect(() => {
    const stored = localStorage.getItem(TOKEN_KEY)
    if (!stored) { setChecking(false); return }
    verifyAdminToken(stored)
      .then(() => { setToken(stored); setAuthed(true) })
      .catch(() => localStorage.removeItem(TOKEN_KEY))
      .finally(() => setChecking(false))
  }, [])

  if (checking) {
    return <div className="min-h-screen bg-paper-light px-6 pt-24 text-center font-sans text-ink-muted">Verifying…</div>
  }

  if (!authed) {
    return <LoginView token={token} setToken={setToken} onAuthed={() => setAuthed(true)} />
  }

  return <Dashboard token={token} onLogout={() => { localStorage.removeItem(TOKEN_KEY); setAuthed(false); setToken('') }} />
}

/* ── Login ──────────────────────────────────────────────────────────── */

function LoginView({ token, setToken, onAuthed }) {
  const [show, setShow] = useState(false)
  const [status, setStatus] = useState('')

  async function login() {
    setStatus('Verifying…')
    try {
      await verifyAdminToken(token)
      localStorage.setItem(TOKEN_KEY, token)
      onAuthed()
    } catch {
      setStatus('Invalid admin token.')
    }
  }

  return (
    <div className="min-h-screen bg-paper-light px-6 pb-8 pt-24 font-sans text-ink-black">
      <div className="admin-card">
        <div className="mb-7 flex items-baseline gap-3 border-b-2 border-sovereign pb-5">
          <span className="whitespace-nowrap font-serif text-[2rem] font-bold tracking-[0.04em] text-sovereign">R.E.D. Engine</span>
          <span className="rounded-[0.2rem] border border-paper-border bg-paper-light px-2 py-0.5 font-sans text-xs font-bold uppercase tracking-[0.1em] text-ink-muted">Node Administration</span>
        </div>
        <p className="mb-5 text-[0.9rem] leading-[1.5] text-ink-muted">Enter your admin token to access the node dashboard.</p>
        <label className="admin-label">Admin Token</label>
        <div className="mt-1 flex gap-2">
          <input
            type={show ? 'text' : 'password'}
            value={token}
            onChange={e => setToken(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && login()}
            placeholder="Secure token"
            className="admin-input flex-1"
          />
          <button type="button" className="toggle-btn" onClick={() => setShow(s => !s)}>{show ? 'Hide' : 'Show'}</button>
        </div>
        <button className="btn-primary mt-3" onClick={login}>Access Dashboard</button>
        <div className={`status-message mt-2 min-h-[1.25rem] font-sans text-[0.8125rem]${status === 'Invalid admin token.' ? ' error' : ''}`}>{status}</div>
      </div>
    </div>
  )
}

/* ── Dashboard ──────────────────────────────────────────────────────── */

function Dashboard({ token, onLogout }) {
  const call = useCallback(
    (endpoint, opts = {}) => adminRequest(endpoint, { ...opts, token }),
    [token],
  )

  return (
    <div className="min-h-screen bg-paper-light px-6 pb-8 pt-24 font-sans text-ink-black">
      <div className="admin-card">
        <div className="mb-7 flex items-baseline justify-between gap-3 border-b-2 border-sovereign pb-5">
          <div className="flex items-baseline gap-3">
            <span className="whitespace-nowrap font-serif text-[2rem] font-bold tracking-[0.04em] text-sovereign">R.E.D. Engine</span>
            <span className="rounded-[0.2rem] border border-paper-border bg-paper-light px-2 py-0.5 font-sans text-xs font-bold uppercase tracking-[0.1em] text-ink-muted">Node Administration</span>
          </div>
          <button className="btn-secondary" onClick={onLogout}>Logout</button>
        </div>

        <div className="mb-8 flex items-start gap-3.5 rounded-r border-l-4 border-[#86efac] bg-[#f0fdf4] px-[1.125rem] py-3.5">
          <div>
            <h3 className="mb-0.5 font-sans text-[0.9375rem] font-bold text-[#166534]">Authenticated</h3>
            <p className="font-sans text-sm text-ink-mid">Session active. All changes take effect immediately.</p>
          </div>
        </div>

        <NodeIdentity />
        <ContributorsSection call={call} />
        <PeersSection call={call} />
        <ImportSection call={call} />
        <StartupSyncSection call={call} />
      </div>
    </div>
  )
}

/* ── Node identity + HUD ────────────────────────────────────────────── */

function NodeIdentity() {
  const [info, setInfo] = useState(null)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    fetchNodeInfo().then(setInfo).catch(() => setFailed(true))
  }, [])

  const name = info?.name || (failed ? 'Unreachable' : 'Loading…')
  const version = info?.software_version || '—'
  const paths = (info?.exported_paths || []).join(', ') || 'none'
  const endpoint = typeof window !== 'undefined' ? window.location.origin + '/-/nodeinfo' : '/-/nodeinfo'

  return (
    <>
      <div className="mb-5 grid grid-cols-[repeat(auto-fit,minmax(175px,1fr))] gap-3.5">
        <Hud label="Node Name" value={name} />
        <Hud label="Software Version" value={version} />
        <Hud label="Exported Paths" value={paths} />
        <Hud label="Node Status" value={failed ? 'Unreachable' : 'Online'} ok={!failed} />
      </div>

      <Section title="Node Identity" subtitle="Details broadcast via the /-/nodeinfo endpoint to peer nodes.">
        <div className="mt-4 rounded-[0.3rem] border border-paper-border bg-paper-white p-5">
          <Row label="Name">{name}</Row>
          <Row label="Software Version">{version}</Row>
          <Row label="Exported Paths">{paths}</Row>
          <Row label="Nodeinfo Endpoint" last>
            <code className="break-all rounded-[0.2rem] border border-paper-border bg-paper-light px-1.5 py-0.5 font-mono text-[0.8125rem] text-ink-mid">{endpoint}</code>
          </Row>
        </div>
      </Section>
    </>
  )
}

function Hud({ label, value, ok }) {
  const color = ok === false ? 'text-[#dc2626]' : ok === true ? 'text-[#15803d]' : 'text-ink-black'
  return (
    <div className="hud-stat">
      <div className="mb-[0.35rem] font-sans text-[0.65rem] font-bold uppercase tracking-[0.12em] text-ink-muted">{label}</div>
      <div className={`break-all font-mono text-[0.9rem] font-semibold leading-[1.3] ${color}`}>{value}</div>
    </div>
  )
}

function Row({ label, children, last }) {
  return (
    <p className={`flex flex-wrap items-baseline gap-3 py-2 font-sans text-sm text-ink-mid${last ? '' : ' border-b border-paper-border'}`}>
      <strong className="min-w-[9rem] shrink-0 text-[0.7rem] font-bold uppercase tracking-[0.07em] text-ink-muted">{label}</strong>
      <span>{children}</span>
    </p>
  )
}

/* ── Trusted contributors ───────────────────────────────────────────── */

function ContributorsSection({ call }) {
  const [list, setList] = useState([])
  const [name, setName] = useState('')
  const [key, setKey] = useState('')
  const [status, setStatus] = useState({ msg: '', kind: '' })

  const load = useCallback(() => {
    call('/-/admin/contributors').then(r => r.ok && r.json()).then(d => d && setList(d)).catch(() => {})
  }, [call])
  useEffect(() => { load() }, [load])

  async function add() {
    const n = name.trim(), k = key.trim()
    if (!n || !k) return setStatus({ msg: 'Both name and public key are required.', kind: 'error' })
    if (k.length !== 64 || !/^[0-9a-fA-F]+$/.test(k)) return setStatus({ msg: 'Public key must be exactly 64 hex characters.', kind: 'error' })
    setStatus({ msg: 'Adding…', kind: '' })
    const r = await call('/-/admin/contributors/add', { method: 'POST', body: { name: n, public_key: k } })
    if (r.ok) {
      setStatus({ msg: 'Contributor added. Content signed by this key will now be verified.', kind: 'success' })
      setName(''); setKey(''); load()
    } else {
      setStatus({ msg: 'Error: ' + await r.text(), kind: 'error' })
    }
  }

  async function revoke(publicKey) {
    if (!confirm('Revoke this contributor? Files signed by this key will show as Untrusted until the key is re-added.')) return
    const r = await call('/-/admin/contributors/delete', { method: 'POST', body: { public_key: publicKey } })
    if (r.ok) load(); else alert('Failed to revoke: ' + await r.text())
  }

  return (
    <Section title="Trusted Contributors" subtitle="Add a writer's Ed25519 public key to authorise their signed content. Files signed by a trusted key display as Verified.">
      <div className="mb-4">
        {list.length === 0 ? (
          <p className="px-5 py-5 text-center text-sm italic text-ink-muted">No trusted contributors yet.</p>
        ) : (
          <ul className="list-none overflow-hidden rounded-[0.3rem] border border-paper-border">
            {list.map(c => (
              <li key={c.public_key} className="flex items-center justify-between gap-4 border-b border-paper-border px-4 py-3 last:border-b-0 even:bg-paper-light">
                <div className="min-w-0 flex-1">
                  <strong className="block text-[0.9rem] text-ink-black">{c.name}</strong>
                  <code className="mt-1 block break-all rounded-[0.2rem] border border-paper-border bg-paper-light px-1.5 py-0.5 font-mono text-xs text-ink-muted">{c.public_key}</code>
                </div>
                <button className="btn-delete-small" onClick={() => revoke(c.public_key)}>Revoke</button>
              </li>
            ))}
          </ul>
        )}
      </div>
      <div className="mt-4 rounded-[0.3rem] border border-paper-border bg-paper-white p-5">
        <label className="admin-label">Name</label>
        <input className="admin-input" value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Alice" />
        <label className="admin-label mt-3">Public Key <span className="font-normal normal-case tracking-normal">(64-character hex)</span></label>
        <input className="admin-input font-mono" value={key} onChange={e => setKey(e.target.value)} placeholder="64-character hex string" />
        <button className="btn-success mt-3" onClick={add}>Add Contributor</button>
        <StatusLine status={status} />
      </div>
    </Section>
  )
}

/* ── Peer nodes ─────────────────────────────────────────────────────── */

function PeersSection({ call }) {
  const [list, setList] = useState([])
  const [url, setUrl] = useState('')
  const [type, setType] = useState('upstream')
  const [status, setStatus] = useState({ msg: '', kind: '' })

  const load = useCallback(() => {
    call('/-/admin/peers').then(r => r.ok && r.json()).then(d => d && setList(d)).catch(() => {})
  }, [call])
  useEffect(() => { load() }, [load])

  async function add() {
    if (!url.trim()) return setStatus({ msg: 'URL is required.', kind: 'error' })
    setStatus({ msg: 'Connecting to peer…', kind: '' })
    const r = await call('/-/admin/peers/add', { method: 'POST', body: { url: url.trim(), peer_type: type } })
    if (r.ok) { setStatus({ msg: 'Peer added.', kind: 'success' }); setUrl(''); load() }
    else setStatus({ msg: 'Error: ' + await r.text(), kind: 'error' })
  }

  async function refresh(u) {
    const r = await call('/-/admin/peers/refresh', { method: 'POST', body: { url: u } })
    if (r.ok) load(); else alert('Failed to refresh: ' + await r.text())
  }
  async function remove(u) {
    if (!confirm(`Remove peer ${u}?`)) return
    const r = await call('/-/admin/peers/delete', { method: 'POST', body: { url: u } })
    if (r.ok) load(); else alert('Failed to delete: ' + await r.text())
  }
  async function syncAll(u, paths) {
    if (!paths || paths.length === 0) return alert('No exported paths to sync.')
    for (const remotePath of paths) {
      const folderName = remotePath.replace(/^\//, '')
      const r = await call('/-/import', { method: 'POST', body: { peer_url: u, remote_path: remotePath, filename: folderName, saveToStartup: false } })
      if (!r.ok) return alert('Failed to sync ' + remotePath + ': ' + await r.text())
    }
    alert('All paths synced from ' + u)
  }

  return (
    <Section title="Peer Nodes" subtitle="Connect upstream nodes (pull from), downstream nodes (push to), or mirrors (bidirectional).">
      <div className="mb-4">
        {list.length === 0 ? (
          <p className="px-5 py-5 text-center text-sm italic text-ink-muted">No peer nodes configured.</p>
        ) : (
          <ul className="flex list-none flex-col gap-2.5">
            {list.map(p => <PeerRow key={p.url} peer={p} call={call} onRefresh={refresh} onRemove={remove} onSync={syncAll} />)}
          </ul>
        )}
      </div>
      <div className="mt-4 rounded-[0.3rem] border border-paper-border bg-paper-white p-5">
        <label className="admin-label">Peer URL</label>
        <input className="admin-input" value={url} onChange={e => setUrl(e.target.value)} placeholder="https://node.example.com" />
        <label className="admin-label mt-3">Peer Type</label>
        <select className="admin-input" value={type} onChange={e => setType(e.target.value)}>
          <option value="upstream">Upstream — pull content from this peer</option>
          <option value="downstream">Downstream — push content to this peer</option>
          <option value="mirror">Mirror — bidirectional sync</option>
        </select>
        <button className="btn-success mt-3" onClick={add}>Add Peer</button>
        <StatusLine status={status} />
      </div>
    </Section>
  )
}

function PeerRow({ peer, call, onRefresh, onRemove, onSync }) {
  const [health, setHealth] = useState('Checking…')
  const paths = peer.exported_paths || []

  useEffect(() => {
    let cancelled = false
    call('/-/admin/peers/health?url=' + encodeURIComponent(peer.url))
      .then(r => (r.ok ? r.json() : { status: 'down' }))
      .then(d => { if (!cancelled) setHealth(d.status === 'up' ? '🟢 Online' : '🔴 Offline') })
      .catch(() => { if (!cancelled) setHealth('🔴 Offline') })
    return () => { cancelled = true }
  }, [call, peer.url])

  return (
    <li className="flex items-start justify-between gap-4 rounded-[0.3rem] border border-paper-border bg-paper-white px-4 py-3.5">
      <div className="min-w-0 flex-1">
        <strong className="block text-[0.9375rem] text-ink-black">{peer.name || peer.url}</strong>
        <code className="mt-1 block break-all font-mono text-xs text-ink-muted">{peer.url}</code>
        <span className="mr-1.5 mt-1.5 inline-block rounded-[0.2rem] border border-paper-border bg-paper-light px-[0.45rem] py-[0.15rem] font-sans text-[0.65rem] font-bold uppercase tracking-[0.07em] text-sovereign">{peer.peer_type || 'upstream'}</span>
        <span className="font-mono text-xs text-ink-muted">{paths.join(', ') || 'no exported paths'}</span>
        <div className="mt-1.5 font-sans text-[0.8125rem] text-ink-muted">Health: <span className="font-bold">{health}</span></div>
      </div>
      <div className="flex shrink-0 flex-col gap-1.5">
        <button className="btn-success" onClick={() => onSync(peer.url, paths)}>Sync All</button>
        <button className="btn-secondary" onClick={() => onRefresh(peer.url)}>Refresh</button>
        <button className="btn-delete-small" onClick={() => onRemove(peer.url)}>Remove</button>
      </div>
    </li>
  )
}

/* ── Import remote content ──────────────────────────────────────────── */

function ImportSection({ call }) {
  const [url, setUrl] = useState('')
  const [filename, setFilename] = useState('')
  const [save, setSave] = useState(true)
  const [status, setStatus] = useState({ msg: '', kind: '' })

  async function run() {
    setStatus({ msg: 'Syncing…', kind: '' })
    const r = await call('/-/import', { method: 'POST', body: { url, filename, saveToStartup: save } })
    const text = await r.text()
    if (r.ok) { setStatus({ msg: text, kind: 'success' }); setUrl(''); setFilename('') }
    else setStatus({ msg: 'Error: ' + text, kind: 'error' })
  }

  return (
    <Section title="Import Remote Content" subtitle="Pull a Git repository, zip archive, tarball, or raw file into this node's data directory.">
      <label className="admin-label">URL</label>
      <input className="admin-input" value={url} onChange={e => setUrl(e.target.value)} placeholder="https://github.com/org/repo.git" />
      <label className="admin-label mt-3">Local Directory Name <span className="font-normal normal-case tracking-normal">(auto-detected if blank)</span></label>
      <input className="admin-input" value={filename} onChange={e => setFilename(e.target.value)} placeholder="Leave blank to auto-detect" />
      <label className="my-3 flex items-center gap-2 text-sm text-ink-mid">
        <input type="checkbox" checked={save} onChange={e => setSave(e.target.checked)} className="accent-sovereign" />
        Save to startup database — re-sync on every boot
      </label>
      <button className="btn-primary" onClick={run}>Import &amp; Sync</button>
      <StatusLine status={status} />
    </Section>
  )
}

/* ── Startup sync sources ───────────────────────────────────────────── */

function StartupSyncSection({ call }) {
  const [items, setItems] = useState([])

  const load = useCallback(() => {
    call('/-/admin/config').then(r => r.ok && r.json()).then(d => d && setItems(d)).catch(() => {})
  }, [call])
  useEffect(() => { load() }, [load])

  async function remove(filename, deleteLocal) {
    const msg = `Stop tracking "${filename}"?` + (deleteLocal ? ' Local files will be permanently deleted.' : '')
    if (!confirm(msg)) return
    const r = await call('/-/admin/remove', { method: 'POST', body: { filename, deleteLocalFiles: deleteLocal } })
    if (r.ok) load(); else alert('Remove failed: ' + await r.text())
  }

  return (
    <Section title="Startup Sync Sources" subtitle="These sources are re-synced automatically each time the node boots." last>
      {items.length === 0 ? (
        <p className="px-5 py-5 text-center text-sm italic text-ink-muted">No startup sync sources configured.</p>
      ) : (
        <ul className="flex list-none flex-col gap-2.5">
          {items.map(item => <SyncRow key={item.filename} item={item} onRemove={remove} />)}
        </ul>
      )}
    </Section>
  )
}

function SyncRow({ item, onRemove }) {
  const [deleteLocal, setDeleteLocal] = useState(true)
  return (
    <li className="flex items-start justify-between gap-4 rounded-[0.3rem] border border-paper-border bg-paper-white px-4 py-3.5">
      <div className="min-w-0 flex-1">
        <strong className="block text-[0.9rem] font-semibold text-ink-black">{item.filename}</strong>
        <span className="mt-1 block break-all font-mono text-xs text-ink-muted">{item.url}</span>
        <label className="mt-2 inline-flex items-center gap-1 font-sans text-xs text-ink-muted">
          <input type="checkbox" checked={deleteLocal} onChange={e => setDeleteLocal(e.target.checked)} className="accent-sovereign" /> Delete local files on remove
        </label>
      </div>
      <button className="btn-delete" onClick={() => onRemove(item.filename, deleteLocal)}>Remove</button>
    </li>
  )
}

/* ── Shared bits ────────────────────────────────────────────────────── */

function Section({ title, subtitle, children }) {
  return (
    <div className="border-t border-paper-border py-8">
      <h2 className="section-title mb-1">{title}</h2>
      {subtitle && <p className="mb-4 text-sm leading-[1.5] text-ink-muted">{subtitle}</p>}
      {children}
    </div>
  )
}

function StatusLine({ status }) {
  return (
    <div className={`status-message mt-2 min-h-[1.25rem] font-sans text-[0.8125rem]${status.kind ? ' ' + status.kind : ''}`}>
      {status.msg}
    </div>
  )
}
