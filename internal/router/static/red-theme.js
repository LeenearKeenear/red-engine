/* red-theme.js — DEMO ONLY
   Mirrors tailwind-input.css for the in-browser Tailwind Play CDN so the
   standalone demo renders the exact same Paper & Ink system. Production
   builds the real tailwind.css from tailwind-input.css; this file is not
   needed there. Load AFTER the Play CDN <script>. */

/* 1 ── design tokens → Tailwind theme */
tailwind.config = {
    theme: {
        extend: {
            colors: {
                sovereign: { DEFAULT: '#740010', hover: '#5a000c' },
                ink:   { black: '#1b1c1c', mid: '#3a3b3b', muted: '#6b6c6c' },
                paper: { white: '#fbf9f8', light: '#f0ece8', border: '#d8d4cf', hover: '#e4e0db' },
            },
            fontFamily: {
                serif: ["'EB Garamond'", 'Georgia', 'serif'],
                sans:  ["'Public Sans'", 'system-ui', '-apple-system', 'sans-serif'],
                mono:  ["'JetBrains Mono'", "'Fira Code'", "'Courier New'", 'monospace'],
            },
        },
    },
};

/* 2 ── @layer components (kept slim — mirrors tailwind-input.css) */
const __redComponentCSS = `
@layer components {
    .btn-primary { display:inline-block; cursor:pointer; border:0; border-radius:0.25rem; padding:0.5rem 1.25rem; font-size:0.875rem; font-weight:600; letter-spacing:0.02em; color:#fff; background-color:#740010; font-family:'Public Sans',sans-serif; transition:background-color .2s; }
    .btn-primary:hover { background-color:#5a000c; }
    .btn-success { display:inline-block; cursor:pointer; border:0; border-radius:0.25rem; padding:0.5rem 1.25rem; font-size:0.875rem; font-weight:600; color:#fff; background-color:#15803d; font-family:'Public Sans',sans-serif; transition:background-color .2s; }
    .btn-success:hover { background-color:#166534; }
    .btn-secondary { display:inline-block; cursor:pointer; border-radius:0.25rem; padding:0.35rem 0.875rem; font-size:0.8125rem; font-weight:500; background-color:#f0ece8; color:#3a3b3b; border:1px solid #d8d4cf; font-family:'Public Sans',sans-serif; transition:background-color .12s; }
    .btn-secondary:hover { background-color:#e4e0db; }
    .btn-delete { cursor:pointer; border:0; border-radius:0.25rem; padding:0.375rem 0.875rem; font-size:0.8125rem; font-weight:500; color:#fff; background-color:#dc2626; font-family:'Public Sans',sans-serif; transition:background-color .15s; }
    .btn-delete:hover { background-color:#b91c1c; }
    .btn-delete-small { cursor:pointer; background:transparent; border-radius:0.2rem; padding:0.25rem 0.5rem; font-size:0.75rem; color:#dc2626; border:1px solid #fca5a5; font-family:'Public Sans',sans-serif; transition:all .12s; }
    .btn-delete-small:hover { background-color:#fff1f2; border-color:#dc2626; }
    .toggle-btn { cursor:pointer; white-space:nowrap; border-radius:0.25rem; padding:0.5rem 1rem; font-size:0.8125rem; background-color:#f0ece8; color:#3a3b3b; border:1px solid #d8d4cf; font-family:'Public Sans',sans-serif; transition:background-color .12s; }
    .toggle-btn:hover { background-color:#e4e0db; }

    .admin-input { width:100%; border-radius:0.25rem; padding:0.5rem 0.75rem; font-size:0.9rem; outline:none; background-color:#fbf9f8; color:#1b1c1c; border:1px solid #d8d4cf; font-family:'Public Sans',sans-serif; transition:border-color .15s, box-shadow .15s; }
    .admin-input:focus { border-color:#740010; box-shadow:0 0 0 3px rgba(116,0,16,0.1); }
    .admin-input.font-mono { font-family:'JetBrains Mono','Courier New',monospace; font-size:0.8125rem; }
    .admin-label { display:block; margin-bottom:0.375rem; font-size:0.75rem; font-weight:700; text-transform:uppercase; letter-spacing:0.07em; color:#3a3b3b; }

    .admin-card { margin:0 auto; border-radius:0.375rem; background:#fff; max-width:72rem; border:1px solid #d8d4cf; box-shadow:0 1px 4px rgba(0,0,0,0.07),0 4px 16px rgba(0,0,0,0.05); padding:2rem 2.5rem; }
    .hud-stat { border-radius:0.3rem; background-color:#fbf9f8; border:1px solid #d8d4cf; padding:0.875rem 1rem; }

    .hub-card { display:flex; flex-direction:column; overflow:hidden; border-radius:0.375rem; background:#fff; text-decoration:none; color:inherit; border:1px solid #d8d4cf; transition:box-shadow .15s, transform .12s; }
    .hub-card:hover { box-shadow:0 4px 20px rgba(0,0,0,0.12); transform:translateY(-2px); }

    .nav-link { display:block; border-radius:0.2rem; padding:0.3rem 0.5rem; font-size:0.875rem; line-height:1.4; text-decoration:none; color:#3a3b3b; transition:background-color .12s, color .12s; }
    .nav-link:hover { background-color:#e4e0db; color:#740010; }
    .nav-link.active { background-color:#e4e0db; color:#740010; font-weight:600; }

    .section-title { font-family:'EB Garamond',Georgia,serif; font-size:1.45rem; font-weight:700; color:#1b1c1c; }

    .prose-red { font-family:'EB Garamond',Georgia,serif; font-size:1.175rem; line-height:1.82; color:#1b1c1c; }
    .prose-red h1,.prose-red h2,.prose-red h3,.prose-red h4 { font-family:'EB Garamond',Georgia,serif; color:#1b1c1c; margin-top:1.75em; margin-bottom:0.5em; font-weight:700; }
    .prose-red h1 { font-size:2.1rem; }
    .prose-red h2 { font-size:1.6rem; border-bottom:1px solid #d8d4cf; padding-bottom:0.3em; }
    .prose-red h3 { font-size:1.3rem; }
    .prose-red h4 { font-size:1.1rem; font-style:italic; }
    .prose-red p { margin-bottom:1.25em; }
    .prose-red a { color:#740010; text-decoration:underline; text-underline-offset:2px; transition:color .12s; }
    .prose-red a:hover { color:#5a000c; }
    .prose-red code { font-family:'JetBrains Mono','Courier New',monospace; background-color:#f0ece8; padding:0.15rem 0.35rem; border-radius:0.2rem; font-size:0.875em; color:#740010; border:1px solid #d8d4cf; }
    .prose-red pre { background-color:#1b1c1c; color:#e8e4e0; padding:1.25rem; border-radius:0.3rem; overflow-x:auto; margin:1.5rem 0; font-size:0.9rem; line-height:1.65; }
    .prose-red pre code { background:none; color:inherit; padding:0; border:none; font-size:inherit; }
    .prose-red blockquote { border-left:3px solid #740010; padding-left:1.25rem; font-style:italic; color:#3a3b3b; margin:1.5rem 0; }
    .prose-red ul,.prose-red ol { margin:1.25rem 0; padding-left:2rem; }
    .prose-red ul { list-style:disc; }
    .prose-red ol { list-style:decimal; }
    .prose-red li { margin:0.4rem 0; }
    .prose-red table { width:100%; border-collapse:collapse; margin:1.5rem 0; font-size:0.975rem; }
    .prose-red th,.prose-red td { border:1px solid #d8d4cf; padding:0.5rem 0.75rem; text-align:left; }
    .prose-red th { background-color:#f0ece8; font-family:'Public Sans',sans-serif; font-size:0.8125rem; font-weight:700; text-transform:uppercase; letter-spacing:0.05em; color:#3a3b3b; }
}`;

(function injectComponentLayer() {
    const style = document.createElement('style');
    style.type = 'text/tailwindcss';
    style.textContent = __redComponentCSS;
    document.head.appendChild(style);
})();
