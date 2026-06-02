import { useState, useEffect, useCallback } from 'react'
import { fetchNodeInfo, fetchPeers } from '../api.js'
import { tunnelLabel, shortKey, relativeTime } from '../util.js'

// Public peer directory (/-/nodes). Mirrors templates/nodes.html: this node's
// identity header, then a grid of peer cards with cached health, tunnel/type
// badges, exported paths, the Ed25519 key chip, and copy-to-clipboard.
export default function NodesDirectory() {
  const [self, setSelf] = useState(null)
  const [peers, setPeers] = useState([])
  const [error, setError] = useState(null)
  const [toast, setToast] = useState('')

  useEffect(() => {
    Promise.all([fetchNodeInfo(), fetchPeers()])
      .then(([info, peerList]) => {
        setSelf(info)
        setPeers(Array.isArray(peerList) ? peerList : [])
      })
      .catch(err => setError(err.message))
  }, [])

  const showToast = useCallback(msg => {
    setToast(msg)
    window.clearTimeout(showToast._t)
    showToast._t = window.setTimeout(() => setToast(''), 1400)
  }, [])

  function copy(text, label) {
    navigator.clipboard.writeText(text).then(() => showToast(label)).catch(() => showToast('Copy failed'))
  }

  if (error) return <ErrorState message={error} />
  if (!self) return <div className="loading-state pt-24 p-10 text-center text-ink-muted">Loading…</div>

  const selfTunnel = tunnelLabel(self.tunnel_type)

  return (
    <div className="min-h-screen bg-paper-light px-6 pb-10 pt-24 font-sans text-ink-black">
      <div className="mx-auto max-w-5xl">

        {/* This node's identity */}
        <header className="mb-8 rounded-md border border-paper-border bg-white p-7 shadow-sm">
          <div className="mb-5 flex flex-wrap items-baseline gap-3 border-b-2 border-sovereign pb-4">
            <span className="whitespace-nowrap font-serif text-[2rem] font-bold tracking-[0.03em] text-sovereign">{self.name || 'This Node'}</span>
            <span className="rounded-[0.2rem] border border-paper-border bg-paper-light px-2 py-0.5 font-sans text-xs font-bold uppercase tracking-[0.1em] text-ink-muted">Network Nodes</span>
          </div>

          <p className="mb-5 max-w-2xl text-[0.9rem] leading-[1.55] text-ink-muted">
            You are viewing the peer directory for this node. Identity is anchored to the
            {' '}<strong className="text-ink-mid">Ed25519 public key</strong>, never the URL — a node may move
            between addresses (e.g. a Cloudflare quick tunnel) while keeping the same identity.
          </p>

          <div className="grid grid-cols-1 gap-x-8 gap-y-2.5 sm:grid-cols-2">
            {self.public_url && (
              <Field label="Public URL">
                <a href={self.public_url} className="break-all font-mono text-[0.8125rem] text-sovereign hover:text-sovereign-hover">{self.public_url}</a>
              </Field>
            )}
            {selfTunnel && (
              <Field label="Tunnel"><span className="badge badge-tunnel">{selfTunnel}</span></Field>
            )}
            {self.public_key && (
              <div className="flex flex-wrap items-baseline gap-2 sm:col-span-2">
                <span className="min-w-[7rem] shrink-0 font-sans text-[0.7rem] font-bold uppercase tracking-[0.07em] text-ink-muted">Public Key</span>
                <span className="key-chip" title="Click to copy full key" onClick={() => copy(self.public_key, 'Public key copied')}>{shortKey(self.public_key)}…</span>
                {self.public_url && (
                  <button className="copy-btn ml-1" onClick={() => copy(self.public_url, 'URL copied')}>Copy URL</button>
                )}
              </div>
            )}
            {self.description && (
              <Field label="About" wide>
                <span className="font-serif text-[0.95rem] italic leading-[1.5] text-ink-mid">{self.description}</span>
              </Field>
            )}
          </div>
        </header>

        {/* Peer directory */}
        <div className="mb-4 flex items-baseline justify-between">
          <h2 className="font-serif text-[1.45rem] font-bold text-ink-black">Connected Nodes</h2>
          <span className="font-sans text-sm text-ink-muted">{peers.length} known peer{peers.length === 1 ? '' : 's'}</span>
        </div>

        {peers.length > 0 ? (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {peers.map(p => <PeerCard key={p.public_key || p.url} peer={p} onCopy={copy} />)}
          </div>
        ) : (
          <div className="rounded-md border border-dashed border-paper-border bg-white p-10 text-center">
            <p className="font-serif text-[1.1rem] italic text-ink-muted">No peer nodes are known yet.</p>
            <p className="mt-1.5 font-sans text-sm text-ink-muted">Add peers from the admin panel to populate this directory.</p>
          </div>
        )}

        <footer className="mt-10 border-t border-paper-border pt-5 text-center font-sans text-xs text-ink-muted">
          Resilient · Encrypted · Decentralized — peer status is cached from the last health check, not live-probed.
        </footer>
      </div>

      <div className={`pointer-events-none fixed bottom-6 left-1/2 -translate-x-1/2 rounded-md bg-ink-black px-4 py-2 font-sans text-sm text-white shadow-lg transition-opacity duration-200 ${toast ? 'opacity-100' : 'opacity-0'}`}>
        {toast || 'Copied'}
      </div>
    </div>
  )
}

function Field({ label, children, wide }) {
  return (
    <div className={`flex flex-wrap items-baseline gap-2${wide ? ' sm:col-span-2' : ''}`}>
      <span className="min-w-[7rem] shrink-0 font-sans text-[0.7rem] font-bold uppercase tracking-[0.07em] text-ink-muted">{label}</span>
      {children}
    </div>
  )
}

function PeerCard({ peer, onCopy }) {
  const tunnel = tunnelLabel(peer.tunnel_type)
  const paths = peer.exported_paths || []
  const contact = peer.public_url || peer.url

  return (
    <div className="node-card">
      <div className="mb-2.5 flex items-start justify-between gap-3">
        <a href={contact} className="font-serif text-[1.2rem] font-bold leading-tight text-sovereign hover:text-sovereign-hover">{peer.name || peer.url}</a>
        {peer.is_online
          ? <span className="badge badge-online shrink-0">● Online</span>
          : <span className="badge badge-offline shrink-0">● Offline</span>}
      </div>

      <div className="mb-3 flex flex-wrap items-center gap-1.5">
        <span className="badge badge-type">{peer.peer_type || 'upstream'}</span>
        {tunnel && <span className="badge badge-tunnel">{tunnel}</span>}
        <span className="font-sans text-xs text-ink-muted">· seen {relativeTime(peer.last_seen)}</span>
      </div>

      {peer.description && (
        <p className="mb-3 font-serif text-[0.95rem] italic leading-[1.5] text-ink-mid">{peer.description}</p>
      )}

      <div className="mb-3 flex items-center gap-2">
        <a href={contact} className="break-all font-mono text-[0.8125rem] text-ink-mid hover:text-sovereign">{peer.url}</a>
      </div>

      {paths.length > 0 && (
        <div className="mb-3">
          <div className="mb-1.5 font-sans text-[0.65rem] font-bold uppercase tracking-[0.1em] text-ink-muted">Exported Paths</div>
          <div className="flex flex-wrap gap-1.5">
            {paths.map(ep => (
              <a key={ep} href={`${contact}${ep}`} className="path-link">{ep}</a>
            ))}
          </div>
        </div>
      )}

      <div className="mt-auto flex flex-wrap items-center justify-between gap-2 border-t border-paper-border pt-3">
        {peer.public_key
          ? <span className="key-chip" title="Click to copy full key" onClick={() => onCopy(peer.public_key, 'Public key copied')}>{shortKey(peer.public_key)}…</span>
          : <span className="font-sans text-xs italic text-ink-muted">no public key</span>}
        <button className="copy-btn" onClick={() => onCopy(peer.url, 'URL copied')}>Copy peer URL</button>
      </div>
    </div>
  )
}

function ErrorState({ message }) {
  return (
    <div className="min-h-screen bg-paper-light px-6 pt-24">
      <div className="mx-auto max-w-[680px] rounded border border-[#fca5a5] bg-[#fff1f2] px-5 py-4 font-sans text-sm text-[#b91c1c]">{message}</div>
    </div>
  )
}
