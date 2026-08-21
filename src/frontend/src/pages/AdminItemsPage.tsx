import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useCollections } from '../api/collections'
import { SCRAPE_STATUS_LABEL, useAdminItemList } from '../api/items'
import { useDebouncedValue } from '../hooks/useDebouncedValue'
import { ADMIN_INPUT, ADMIN_LABEL, ADMIN_LINK } from '../components/Admin/adminUi'

/** Admin item list -- lets the admin find and jump into editing any item
 * without knowing its id or hunting through the public site first (the gap
 * flagged in docs/tz/TECH_DEBT.md right after AdminEditItemPage shipped).
 * Reuses the public GET /api/items endpoint as-is (search/collection filter
 * were already supported server-side, or a one-line addition -- see
 * ItemController::index()'s `q` filter) rather than a dedicated admin
 * endpoint. Same minimal Tailwind pass as the rest of the admin, see
 * components/Admin/adminUi.ts. */
export function AdminItemsPage() {
  const location = useLocation()
  const { data: collections } = useCollections()

  const [collectionId, setCollectionId] = useState<number | null>(null)
  const [query, setQuery] = useState('')
  const debouncedQuery = useDebouncedValue(query)

  const { data, isLoading } = useAdminItemList({ collectionId, q: debouncedQuery })

  // AdminEditItemPage returns here (this exact search/filter) after
  // Save/Delete -- see resolveReturnTo() there.
  const returnTo = `${location.pathname}${location.search}`

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <p className="mb-4">
        <Link to="/admin" className={ADMIN_LINK}>
          &larr; Back
        </Link>
      </p>
      <h1 className="mb-6 text-2xl font-semibold text-neutral-900">Items</h1>

      <div className="mb-4 flex gap-4">
        <div className="flex-1">
          <label className={ADMIN_LABEL}>Search</label>
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by title..."
            className={ADMIN_INPUT}
          />
        </div>
        <div className="flex-1">
          <label className={ADMIN_LABEL}>Collection</label>
          <select
            value={collectionId ?? ''}
            onChange={(e) => setCollectionId(e.target.value ? Number(e.target.value) : null)}
            className={ADMIN_INPUT}
          >
            <option value="">All collections</option>
            {collections?.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {isLoading && <p className="text-neutral-500">Loading...</p>}

      {!isLoading && data?.data.length === 0 && <p className="text-neutral-500">No items match.</p>}

      {!isLoading && data && data.data.length > 0 && (
        <div className="overflow-hidden rounded-xl border border-neutral-200">
          <table className="w-full text-left text-sm">
            <thead className="bg-neutral-50 text-neutral-500">
              <tr>
                <th className="px-3 py-2 font-medium">Title</th>
                <th className="px-3 py-2 font-medium">Collection</th>
                <th className="px-3 py-2 font-medium">Platform</th>
                <th className="px-3 py-2 font-medium">Status</th>
                <th className="px-3 py-2" />
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100 bg-white">
              {data.data.map((item) => (
                <tr key={item.id}>
                  <td className="flex items-center gap-2 px-3 py-2">
                    {item.cover_url ? (
                      <img src={item.cover_url} alt="" className="h-10 w-8 rounded object-cover" />
                    ) : (
                      <div className="h-10 w-8 rounded bg-neutral-100" />
                    )}
                    <span className="font-medium text-neutral-900">{item.title}</span>
                  </td>
                  <td className="px-3 py-2 text-neutral-600">{item.collection?.name ?? '—'}</td>
                  <td className="px-3 py-2 text-neutral-600">{item.platform?.name ?? '—'}</td>
                  <td className="px-3 py-2 text-neutral-600">
                    {SCRAPE_STATUS_LABEL[item.scrape_status]}
                  </td>
                  <td className="px-3 py-2 text-right">
                    <Link
                      to={`/admin/items/${item.id}/edit`}
                      state={{ from: returnTo }}
                      className="rounded-full border border-neutral-300 bg-white px-2.5 py-1 text-xs font-medium text-neutral-700 hover:bg-neutral-50"
                    >
                      Edit
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
