import { Link } from 'react-router-dom'
import { clean, humanize } from '../util.js'

// Fixed left rail scoped to the active top-level branch, mirroring the <aside>
// in templates/article.html. Uses the legacy .sidebar/.nav-* classes from
// style.css for the exact 260px fixed layout and the ▶ disclosure rotation.
export default function Sidebar({ nav, activePath }) {
  if (!nav) return null

  const active = '/' + clean(activePath)
  const children = nav.children || []
  const branchName = nav.display_name || humanize(clean(nav.path).split('/').pop())

  return (
    <aside className="sidebar">
      <div className="sidebar-content">
        <div className="nav-section">
          <Link to={'/' + clean(nav.path)} className="nav-section-title block no-underline">
            {branchName}
          </Link>
          <div className="nav-links">
            {children.map(node => (
              <NavNode key={node.path} node={node} active={active} />
            ))}
          </div>
        </div>
      </div>
    </aside>
  )
}

function isOnPath(node, active) {
  const self = '/' + clean(node.path)
  return active === self || active.startsWith(self + '/')
}

function NavNode({ node, active }) {
  const to = '/' + clean(node.path)
  const onPath = isOnPath(node, active)

  // Leaf nodes (guides) link straight to the article reader.
  if (node.is_leaf) {
    return (
      <Link to={`/article/${clean(node.path)}`} className={`nav-link${active === to ? ' active' : ''}`}>
        {node.display_name || humanize(clean(node.path).split('/').pop())}
      </Link>
    )
  }

  const children = node.children || []
  return (
    <details className="nav-folder" open={onPath}>
      <summary className="nav-folder-title">
        {node.display_name || humanize(clean(node.path).split('/').pop())}
      </summary>
      <div className="nav-folder-links">
        {children.map(child => (
          <NavNode key={child.path} node={child} active={active} />
        ))}
      </div>
    </details>
  )
}
