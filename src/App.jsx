import { BrowserRouter, Routes, Route } from 'react-router-dom'
import RootLayout from './layouts/RootLayout.jsx'
import HomePage from './pages/HomePage.jsx'
import SectionBrowser from './pages/SectionBrowser.jsx'
import ArticlePage from './pages/ArticlePage.jsx'
import AdminPage from './pages/AdminPage.jsx'
import NodesDirectory from './pages/NodesDirectory.jsx'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<RootLayout />}>
          <Route path="/" element={<HomePage />} />
          <Route path="/-/nodes" element={<NodesDirectory />} />
          <Route path="/-/admin" element={<AdminPage />} />
          {/* Article pages use /article/* prefix to avoid collisions */}
          <Route path="/article/*" element={<ArticlePage />} />
          {/* Section browsing: any other path */}
          <Route path="/:section/*" element={<SectionBrowser />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
