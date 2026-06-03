/* red-search.js — DEMO live search (⌘K). Mirrors the inline script that
   ships in every template; factored out here so the demo stays DRY.
   In production this stays inline per-template and fetches
   /-/search-index.json instead of reading window.RED.SEARCH_INDEX. */
(function () {
    const searchInput      = document.getElementById('search-input');
    const resultsContainer = document.getElementById('search-results');
    if (!searchInput || !resultsContainer) return;

    const index = (window.RED && window.RED.SEARCH_INDEX) || [];

    function escapeHtml(str) {
        if (str == null) return '';
        return str.replace(/[&<>]/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[m]));
    }

    function runSearch(query) {
        if (query.length < 2) {
            resultsContainer.classList.add('hidden');
            resultsContainer.innerHTML = '';
            return;
        }
        const matches = index.filter(item =>
            item.title.toLowerCase().includes(query) ||
            item.path.toLowerCase().includes(query)
        ).slice(0, 10);

        if (matches.length === 0) {
            resultsContainer.innerHTML =
                '<div class="px-3 py-2.5 text-sm italic text-ink-muted">No results found</div>';
        } else {
            resultsContainer.innerHTML = matches.map(item =>
                `<a href="article.html?path=${encodeURIComponent(item.path)}"
                    class="block border-b border-paper-border px-3 py-2 text-sm text-ink-black no-underline transition-colors last:border-b-0 hover:bg-paper-light">
                    ${escapeHtml(item.title)}
                 </a>`
            ).join('');
        }
        resultsContainer.classList.remove('hidden');
    }

    searchInput.addEventListener('input', e => runSearch(e.target.value.trim().toLowerCase()));
    document.addEventListener('click', e => {
        if (!searchInput.contains(e.target) && !resultsContainer.contains(e.target)) {
            resultsContainer.classList.add('hidden');
        }
    });
    document.addEventListener('keydown', e => {
        if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
            e.preventDefault();
            searchInput.focus();
            searchInput.select();
        }
        if (e.key === 'Escape') {
            resultsContainer.classList.add('hidden');
            searchInput.blur();
        }
    });
})();
