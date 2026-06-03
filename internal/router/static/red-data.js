/* red-data.js — DEMO content tree + router
   ----------------------------------------------------------------------
   Stands in for the Go store + serve.go routing decision tree. The shape
   below mirrors models.go Section/Article. Article `body` holds the
   markdown ALREADY rendered to HTML (the engine does this server-side and
   passes it as .Body), so the demo needs no markdown parser.

   THE RULE (per spec):
     A branch renders as a HUB (main.html / sub1.html) only while there is
     NO markdown anywhere in its subtree. The moment a branch contains a
     markdown file anywhere beneath it, selecting that branch dives straight
     into article.html and shows the branch's default .meta/RED_KNOWLEDGE.md,
     with the branch's nested folders in the sidebar.
   ---------------------------------------------------------------------- */

const SWITCH_DEPTH = 2;          // templateSwitchDepth (config.json)
const DEFAULT_DOC  = 'RED_KNOWLEDGE';   // .meta/RED_KNOWLEDGE.md
const SITE_NAME    = 'R.E.D. ENGINE';
const NODE_NAME    = 'node://sovereign-01';

/* ── tiny helpers to author bodies ─────────────────────────── */
const hash = s => {
    let h = 0x811c9dc5;
    for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193); }
    return (h >>> 0).toString(16).padStart(8, '0').repeat(8).slice(0, 64);
};

/* ── the content tree ───────────────────────────────────────
   section: { name, sub:{}, articles:[], cover:bool, redKnowledge:html }
   article: { title, slug, body, verification, author }              */
const TREE = {
    name: 'root', sub: {}, articles: [],
};

function section(name, opts = {}) {
    return { name, sub: {}, articles: [], cover: !!opts.cover, redKnowledge: opts.redKnowledge || null };
}
function article(title, slug, body, verification = 'unsigned', author = '') {
    return { title, slug, body, verification, author };
}

/* ============ 1. FIELD MANUAL — MIXED (folders + markdown) ============ */
const fieldManual = section('Field Manual', {
    cover: true,
    redKnowledge: `
        <h1>Field Manual</h1>
        <p>This branch mixes <strong>nested folders</strong> and <strong>markdown files</strong>,
        so the engine skips the hub view and drops you straight onto this default page —
        <code>.meta/RED_KNOWLEDGE.md</code> — with the full folder tree pinned to the left.</p>
        <blockquote>Read the principles first. Everything downstream assumes them.</blockquote>
        <h2>What lives here</h2>
        <ul>
            <li><a href="#">Operating Principles</a> — the non-negotiables.</li>
            <li><a href="#">Radio Protocol</a> — handshake &amp; frequency discipline.</li>
            <li><a href="#">Extraction</a> — exfil routing under contact.</li>
        </ul>
        <h3>Status</h3>
        <p>All signed entries are verified against the node's trusted-contributor set.</p>`,
});
fieldManual.articles.push(
    article('Operating Principles', 'operating-principles', `
        <h1>Operating Principles</h1>
        <p>The node assumes nothing it cannot verify. Every claim carries a signature; every
        signature resolves to a trusted key or it is treated as <em>untrusted</em>.</p>
        <h2>The three rules</h2>
        <ol>
            <li>Verify before you trust.</li>
            <li>Replicate before you rely.</li>
            <li>Sign before you ship.</li>
        </ol>
        <h2>Reference</h2>
        <pre><code>red verify ./doc.md --key alice.pub
red sign   ./doc.md --key alice.sec</code></pre>
        <p>See <a href="#">Radio Protocol</a> for the on-air equivalent.</p>`, 'verified', 'Alice'),
);

const radio = section('radio-protocol');
radio.articles.push(
    article('Handshake', 'handshake', `
        <h1>Handshake</h1>
        <p>A clean handshake establishes identity and a shared rotation schedule before any
        payload moves. Skip it and the receiver drops the frame.</p>
        <h2>Sequence</h2>
        <table>
            <thead><tr><th>Step</th><th>Sender</th><th>Receiver</th></tr></thead>
            <tbody>
                <tr><td>1</td><td>CALLSIGN</td><td>ACK + NONCE</td></tr>
                <tr><td>2</td><td>SIGN(NONCE)</td><td>VERIFY</td></tr>
                <tr><td>3</td><td>PAYLOAD</td><td>ACK</td></tr>
            </tbody>
        </table>`, 'verified', 'Alice'),
    article('Frequencies', 'frequencies', `
        <h1>Frequencies</h1>
        <p>Frequency tables rotate on a fixed cadence. This entry is <strong>unsigned</strong> —
        treat the numbers as provisional until a trusted contributor signs the release.</p>
        <blockquote>Never transmit a schedule you have not personally verified.</blockquote>`, 'unsigned'),
);

const extraction = section('extraction');
extraction.articles.push(
    article('Exfil Routes', 'exfil-routes', `
        <h1>Exfil Routes</h1>
        <p>Primary, secondary, and burn routes are pre-registered with the node so that a
        compromised path can be revoked without a redraw.</p>
        <ul><li>Primary — fastest, highest exposure.</li><li>Secondary — slower, cold.</li><li>Burn — single use.</li></ul>`, 'verified', 'Cole'),
);
fieldManual.sub['radio-protocol'] = radio;
fieldManual.sub['extraction'] = extraction;

/* ============ 2. CIPHER SYSTEMS — MIXED ============ */
const cipher = section('Cipher Systems', {
    cover: true,
    redKnowledge: `
        <h1>Cipher Systems</h1>
        <p>Key material, rotation, and the Ed25519 signing flow. Because markdown lives in this
        branch, you land here on <code>.meta/RED_KNOWLEDGE.md</code> rather than a card grid.</p>
        <h2>Contents</h2>
        <ul>
            <li><a href="#">Key Exchange</a></li>
            <li><a href="#">Rotation Policy</a> — currently flagged.</li>
            <li><a href="#">Ed25519 / Signing Flow</a></li>
        </ul>`,
});
cipher.articles.push(
    article('Key Exchange', 'key-exchange', `
        <h1>Key Exchange</h1>
        <p>Keys are exchanged out of band and pinned. The node never accepts a key it learns
        in-band during a session.</p>
        <pre><code>red keys import alice.pub
red keys pin   alice</code></pre>`, 'verified', 'Alice'),
    article('Rotation Policy', 'rotation-policy', `
        <h1>Rotation Policy</h1>
        <p>This document's hash no longer matches its signature — it was modified after signing.
        The badge beside the title flags it as tampered.</p>
        <blockquote>Re-sign or revoke. Do not distribute a tampered policy.</blockquote>`, 'tampered', 'Alice'),
);
const ed25519 = section('ed25519');
ed25519.articles.push(
    article('Signing Flow', 'signing-flow', `
        <h1>Signing Flow</h1>
        <p>Sign the canonical bytes, attach the detached signature, publish. Verification
        recomputes the hash and checks it against the trusted key set.</p>
        <pre><code>SHA-256(content) → sign(sk) → attach → publish
verify: SHA-256(content) == open(sig, pk) ?</code></pre>`, 'verified', 'Dana'),
);
cipher.sub['ed25519'] = ed25519;

/* ============ 3. NETWORK DOCTRINE — MIXED (flat) ============ */
const network = section('Network Doctrine', {
    cover: false,
    redKnowledge: `
        <h1>Network Doctrine</h1>
        <p>How sovereign nodes peer, pull, and push. A flat mixed branch: a default page plus
        sibling articles, no sub-folders.</p>
        <h2>Read next</h2>
        <ul><li><a href="#">Peer Topology</a></li><li><a href="#">Sync Strategy</a></li></ul>`,
});
network.articles.push(
    article('Peer Topology', 'peer-topology', `
        <h1>Peer Topology</h1>
        <p>Upstream peers feed you. Downstream peers consume you. Mirrors do both. Health is
        pinged continuously and surfaced in the admin HUD.</p>`, 'verified', 'Dana'),
    article('Sync Strategy', 'sync-strategy', `
        <h1>Sync Strategy</h1>
        <p>Pull on boot, pull on webhook, pull on demand. Conflicts resolve in favor of the
        signed copy with the most recent valid timestamp.</p>`, 'unsigned'),
);

/* ============ 4. COLD ARCHIVES — PURE HUB (no markdown anywhere) ====== */
const archives = section('Cold Archives', { cover: true });
archives.sub['decade-1990s'] = section('decade-1990s');   // empty — no markdown
archives.sub['decade-2000s'] = section('decade-2000s');
archives.sub['decade-2010s'] = section('decade-2010s');

/* mount top-level branches */
TREE.sub['field-manual']    = fieldManual;
TREE.sub['cipher-systems']  = cipher;
TREE.sub['network-doctrine'] = network;
TREE.sub['cold-archives']   = archives;

/* ─────────────────────────────────────────────────────────────
   LOOKUP + ROUTING
   ───────────────────────────────────────────────────────────── */

function segments(path) {
    return (path || '/').split('/').filter(Boolean);
}
function depth(path) { return segments(path).length; }

/* walk to a section by path; returns null if not a section */
function getSection(path) {
    let node = TREE;
    for (const seg of segments(path)) {
        if (node.sub && node.sub[seg]) node = node.sub[seg];
        else return null;
    }
    return node;
}

/* resolve a path that may be a section OR an article (parent + slug) */
function resolve(path) {
    const sec = getSection(path);
    if (sec) return { kind: 'section', section: sec, path };
    const segs = segments(path);
    const slug = segs.pop();
    const parent = getSection('/' + segs.join('/'));
    if (parent) {
        const art = parent.articles.find(a => a.slug === slug);
        if (art) return { kind: 'article', article: art, section: parent, parentPath: '/' + segs.join('/'), path };
    }
    return { kind: 'missing', path };
}

/* THE CORE TEST — does this section contain markdown anywhere beneath it?
   (the hidden .meta/RED_KNOWLEDGE default does NOT count; only real content) */
function hasMarkdownAnywhere(sec) {
    if (!sec) return false;
    if (sec.articles && sec.articles.length) return true;
    for (const k in sec.sub) if (hasMarkdownAnywhere(sec.sub[k])) return true;
    return false;
}

/* the routing decision tree (serve.go) for SELECTING a branch card */
function destinationFor(path) {
    const sec = getSection(path);
    if (!sec) return 'main.html';
    if (hasMarkdownAnywhere(sec)) {
        // dive straight to the default knowledge doc
        return `article.html?path=${encodeURIComponent(path)}`;
    }
    return (depth(path) < SWITCH_DEPTH ? 'main.html' : 'sub1.html') + `?path=${encodeURIComponent(path)}`;
}

/* breadcrumb trail for a path */
function crumbs(path) {
    const out = [];
    let acc = '';
    for (const seg of segments(path)) {
        acc += '/' + seg;
        const sec = getSection(acc);
        out.push({ label: sec ? sec.name : humanize(seg), path: destinationFor(acc) });
    }
    return out;
}

function humanize(slug) {
    return slug.replace(/[-_]/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

/* count articles in a section subtree (for "N guides" on cards) */
function articleCount(sec) {
    let n = sec.articles ? sec.articles.length : 0;
    for (const k in sec.sub) n += articleCount(sec.sub[k]);
    return n;
}

/* ── search index (all real articles across the tree) ───────── */
function buildSearchIndex() {
    const out = [];
    (function walk(sec, path) {
        for (const a of sec.articles) out.push({ title: a.title, path: `${path}/${a.slug}` });
        for (const k in sec.sub) walk(sec.sub[k], `${path}/${k}`);
    })(TREE, '');
    return out;
}
const SEARCH_INDEX = buildSearchIndex();

/* expose */
window.RED = {
    SWITCH_DEPTH, DEFAULT_DOC, SITE_NAME, NODE_NAME, TREE,
    segments, depth, getSection, resolve, hasMarkdownAnywhere,
    destinationFor, crumbs, humanize, articleCount, SEARCH_INDEX, hash,
};
