import { Link } from 'react-router-dom'
import { useCurrentAdmin, useLogout } from '../api/auth'
import { SiteSettingsAdmin } from '../components/Admin/SiteSettingsAdmin'
import { ADMIN_BUTTON_SECONDARY, ADMIN_PAGE } from '../components/Admin/adminUi'

/** Dashboard -- proves the auth loop works end-to-end and hosts the admin
 * screens built out so far (SiteSettingsAdmin/US-180). More get added here
 * as Phase 3 backend pieces land (collections/gifters CRUD, an item list --
 * see docs/tz/TECH_DEBT.md). Minimal Tailwind pass via
 * components/Admin/adminUi.ts, not a real design. */
export function AdminPage() {
  const { data: admin } = useCurrentAdmin()
  const logout = useLogout()

  return (
    <div className={ADMIN_PAGE}>
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-neutral-900">Admin</h1>
          <p className="mt-1 text-neutral-500">Welcome, {admin?.name ?? '...'}.</p>
        </div>
        <button
          onClick={() => logout.mutate()}
          disabled={logout.isPending}
          className={ADMIN_BUTTON_SECONDARY}
        >
          Log out
        </button>
      </div>

      <p className="mt-4">
        <Link to="/admin/add" className={`inline-block ${ADMIN_BUTTON_SECONDARY}`}>
          Add item (IGDB search)
        </Link>
      </p>

      <SiteSettingsAdmin />
    </div>
  )
}
