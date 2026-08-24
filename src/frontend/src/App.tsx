import { Outlet, Route, Routes } from 'react-router-dom'
import { CollectionItemViewPage } from './pages/CollectionItemViewPage'
import { AdminLoginPage } from './pages/AdminLoginPage'
import { AdminPage } from './pages/AdminPage'
import { AdminAddItemPage } from './pages/AdminAddItemPage'
import { AdminAddBookPage } from './pages/AdminAddBookPage'
import { AdminAddManualItemPage } from './pages/AdminAddManualItemPage'
import { AdminEditItemPage } from './pages/AdminEditItemPage'
import { AdminItemsPage } from './pages/AdminItemsPage'
import { ProtectedRoute } from './components/ProtectedRoute'
import { useSiteMeta } from './hooks/useSiteMeta'
import { CurrencyProvider } from './hooks/CurrencyProvider'
import { AdminLangProvider } from './hooks/AdminLangProvider'

/** Wraps every /admin* route (login included) in the Modernist admin theme
 * (see index.css's `.admin-theme` block and components/Admin/adminUi.ts) so
 * the 2026-08 redesign's CSS variables/font are actually defined wherever
 * adminUi's classes are used -- not just the 4 screens the Claude Design
 * handoff covered. AdminLangProvider lives here too (harmless on pages that
 * don't call useAdminLang() yet), rather than duplicated per-page. */
function AdminThemeLayout() {
  return (
    <div className="admin-theme min-h-screen">
      <AdminLangProvider>
        <Outlet />
      </AdminLangProvider>
    </div>
  )
}

function App() {
  // US-180 -- document.title/meta description from admin settings. Once
  // here at the app root, not per-page -- see useSiteMeta's docblock for
  // what this does and doesn't cover.
  useSiteMeta()

  return (
    // US-170 -- lifted from CollectionItemViewPage (public-only) to here so
    // the admin's new "Display currency" select (AdminItemsPage) and price
    // fields (AdminEditItemPage/WishlistAdminPanel) can share the same
    // exchange-rate cache and persisted preference as the public SPA,
    // instead of each admin screen needing its own provider instance.
    <CurrencyProvider>
      <Routes>
        <Route path="/" element={<CollectionItemViewPage />} />
        <Route element={<AdminThemeLayout />}>
          <Route path="/admin/login" element={<AdminLoginPage />} />
          <Route element={<ProtectedRoute />}>
            <Route path="/admin" element={<AdminPage />} />
            <Route path="/admin/add" element={<AdminAddItemPage />} />
            <Route path="/admin/add-book" element={<AdminAddBookPage />} />
            <Route path="/admin/add-manual" element={<AdminAddManualItemPage />} />
            <Route path="/admin/items" element={<AdminItemsPage />} />
            <Route path="/admin/items/:id/edit" element={<AdminEditItemPage />} />
          </Route>
        </Route>
      </Routes>
    </CurrencyProvider>
  )
}

export default App
