import { Navigate, Outlet } from 'react-router-dom'
import { useAuthStore } from '../stores/authStore'
import { useCurrentAdmin } from '../api/auth'

/** Gate for /admin/* routes -- redirects to the login page if there's no
 * token, or if the token turns out to be invalid/expired (US-101). */
export function ProtectedRoute() {
  const token = useAuthStore((state) => state.token)
  const { isLoading, isError } = useCurrentAdmin()

  if (!token || isError) {
    return <Navigate to="/admin/login" replace />
  }

  if (isLoading) {
    return <p>Loading...</p>
  }

  return <Outlet />
}
