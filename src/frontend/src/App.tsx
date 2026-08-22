import { Route, Routes } from 'react-router-dom'
import { CollectionItemViewPage } from './pages/CollectionItemViewPage'
import { AdminLoginPage } from './pages/AdminLoginPage'
import { AdminPage } from './pages/AdminPage'
import { AdminAddItemPage } from './pages/AdminAddItemPage'
import { AdminAddBookPage } from './pages/AdminAddBookPage'
import { AdminEditItemPage } from './pages/AdminEditItemPage'
import { AdminItemsPage } from './pages/AdminItemsPage'
import { ProtectedRoute } from './components/ProtectedRoute'
import { useSiteMeta } from './hooks/useSiteMeta'

function App() {
  // US-180 -- document.title/meta description from admin settings. Once
  // here at the app root, not per-page -- see useSiteMeta's docblock for
  // what this does and doesn't cover.
  useSiteMeta()

  return (
    <Routes>
      <Route path="/" element={<CollectionItemViewPage />} />
      <Route path="/admin/login" element={<AdminLoginPage />} />
      <Route element={<ProtectedRoute />}>
        <Route path="/admin" element={<AdminPage />} />
        <Route path="/admin/add" element={<AdminAddItemPage />} />
        <Route path="/admin/add-book" element={<AdminAddBookPage />} />
        <Route path="/admin/items" element={<AdminItemsPage />} />
        <Route path="/admin/items/:id/edit" element={<AdminEditItemPage />} />
      </Route>
    </Routes>
  )
}

export default App
