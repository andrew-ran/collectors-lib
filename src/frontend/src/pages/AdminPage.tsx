import { Link } from 'react-router-dom'
import { useCurrentAdmin, useLogout } from '../api/auth'

/** Placeholder dashboard -- proves the auth loop works end-to-end.
 * Real admin screens (manage collections, edit items, etc.) get built out
 * from here as Phase 3 backend pieces land. */
export function AdminPage() {
  const { data: admin } = useCurrentAdmin()
  const logout = useLogout()

  return (
    <div style={{ maxWidth: 480, margin: '4rem auto' }}>
      <h1>Admin</h1>
      <p>Welcome, {admin?.name ?? '...'}.</p>
      <p>
        <Link to="/admin/add">Add item (IGDB search)</Link>
      </p>
      <button onClick={() => logout.mutate()} disabled={logout.isPending}>
        Log out
      </button>
    </div>
  )
}
