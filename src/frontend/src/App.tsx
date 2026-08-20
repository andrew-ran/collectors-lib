import { Route, Routes } from 'react-router-dom'
import { CollectionItemViewPage } from './pages/CollectionItemViewPage'
import { AdminLoginPage } from './pages/AdminLoginPage'
import { AdminPage } from './pages/AdminPage'
import { AdminAddItemPage } from './pages/AdminAddItemPage'
import { ProtectedRoute } from './components/ProtectedRoute'

function App() {
  return (
    <Routes>
      <Route path="/" element={<CollectionItemViewPage />} />
      <Route path="/admin/login" element={<AdminLoginPage />} />
      <Route element={<ProtectedRoute />}>
        <Route path="/admin" element={<AdminPage />} />
        <Route path="/admin/add" element={<AdminAddItemPage />} />
      </Route>
    </Routes>
  )
}

export default App
