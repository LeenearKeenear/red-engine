import { Link } from 'react-router-dom'
import { clean, humanize, lastSegment } from '../util.js'

// Mirrors the .hub-card markup from templates/sub1.html. The decorative
// sovereign cover is the default (no-cover) branch — the nav API does not
// report cover images, so we render the woven pattern used in that case.
export default function FolderCard({ node }) {
  const to = '/' + clean(node.path)
  const name = node.display_name || humanize(node.id) || lastSegment(node.path)
  const count = node.guide_count ?? node.child_count ?? 0

  return (
    <Link to={to} className="hub-card">
      <div className="relative h-[120px] overflow-hidden bg-sovereign">
        <div className="absolute inset-0 opacity-[0.18] [background-image:repeating-linear-gradient(45deg,#fff_0,#fff_1px,transparent_1px,transparent_11px)]" />
      </div>
      <div className="flex flex-1 flex-col p-5">
        <div className="mb-2 font-serif text-[1.375rem] font-bold leading-tight text-ink-black">{name}</div>
        {node.description && (
          <p className="mb-3 font-serif text-[0.9rem] italic leading-[1.5] text-ink-muted">{node.description}</p>
        )}
        <div className="mt-auto flex items-center justify-between font-sans text-xs font-medium">
          <span className="whitespace-nowrap text-ink-muted">{count} {count === 1 ? 'guide' : 'guides'}</span>
          <span className="font-bold text-sovereign">→</span>
        </div>
      </div>
    </Link>
  )
}
