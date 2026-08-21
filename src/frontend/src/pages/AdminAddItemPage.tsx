import { useState } from 'react'
import { Link } from 'react-router-dom'
import { isAxiosError } from 'axios'
import { useCollections } from '../api/collections'
import { useIgdbSearch, type IgdbSearchResult } from '../api/igdb'
import { SCRAPE_STATUS_LABEL, useCreateItem, useItemStatus } from '../api/items'
import { useDebouncedValue } from '../hooks/useDebouncedValue'
import {
  ADMIN_BUTTON_PRIMARY,
  ADMIN_BUTTON_SECONDARY,
  ADMIN_CARD,
  ADMIN_INPUT,
  ADMIN_LABEL,
  ADMIN_LINK,
} from '../components/Admin/adminUi'

/** US-110 -- IGDB search "add item" flow, Radarr/Sonarr-style:
 * pick a collection -> debounced search -> pick a result -> confirm
 * platform -> add. US-111's "Scraping..." -> "Ready" status is shown for
 * each item added this session. Minimal Tailwind pass via
 * components/Admin/adminUi.ts -- admin visual design beyond this is still
 * open, see docs/tz/NEXT_STEPS.md. */
export function AdminAddItemPage() {
  const { data: collections } = useCollections()
  // Defaults to the is_default collection without an effect -- derived
  // straight from the query result, only overridden once the admin actually
  // picks something else.
  const defaultCollectionId = collections?.find((c) => c.is_default)?.id ?? collections?.[0]?.id
  const [collectionIdOverride, setCollectionIdOverride] = useState<number | null>(null)
  const collectionId = collectionIdOverride ?? defaultCollectionId ?? null

  const [query, setQuery] = useState('')
  const debouncedQuery = useDebouncedValue(query)
  const {
    data: results,
    isFetching,
    isError: isSearchError,
    error: searchError,
  } = useIgdbSearch(debouncedQuery)

  const [selected, setSelected] = useState<IgdbSearchResult | null>(null)
  const [platformId, setPlatformId] = useState<number | null>(null)

  const createItem = useCreateItem()
  const [addedItemIds, setAddedItemIds] = useState<number[]>([])

  function selectResult(result: IgdbSearchResult) {
    setSelected(result)
    setPlatformId(result.platforms[0]?.id ?? null)
  }

  function confirmAdd() {
    if (!selected || !collectionId) return

    createItem.mutate(
      {
        collection_id: collectionId,
        type: 'game',
        igdb_id: selected.igdb_id,
        title: selected.name ?? `IGDB #${selected.igdb_id}`,
        platform_id: platformId,
      },
      {
        onSuccess: (item) => {
          setAddedItemIds((ids) => [item.id, ...ids])
          setSelected(null)
          setPlatformId(null)
          setQuery('')
        },
      },
    )
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <p className="mb-4">
        <Link to="/admin" className={ADMIN_LINK}>
          &larr; Back
        </Link>
      </p>
      <h1 className="mb-6 text-2xl font-semibold text-neutral-900">Add item (IGDB search)</h1>

      <div className="mb-4">
        <label className={ADMIN_LABEL}>Adding to</label>
        <select
          value={collectionId ?? ''}
          onChange={(e) => setCollectionIdOverride(Number(e.target.value))}
          className={ADMIN_INPUT}
        >
          {collections?.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </div>

      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search a game title..."
        className={ADMIN_INPUT}
      />

      {isFetching && <p className="mt-3 text-sm text-neutral-500">Searching...</p>}

      {isSearchError && (
        <p className="mt-3 text-sm text-red-600">
          Search failed
          {isAxiosError(searchError)
            ? ` (${searchError.response?.status ?? 'network error'}: ${
                searchError.response?.data?.message ?? searchError.message
              })`
            : ''}
          . Check the backend logs (`docker compose logs app`) -- likely an IGDB/Twitch API error.
        </p>
      )}

      {!isFetching && !isSearchError && debouncedQuery && results?.length === 0 && (
        <p className="mt-3 text-sm text-neutral-500">No results.</p>
      )}

      <ul className="mt-2 space-y-1">
        {results?.map((result) => (
          <li key={result.igdb_id}>
            <button
              onClick={() => selectResult(result)}
              className="flex w-full items-center gap-3 rounded-lg border border-transparent p-2 text-left hover:border-neutral-200 hover:bg-neutral-50"
            >
              {result.cover_url ? (
                <img src={result.cover_url} alt="" width={45} className="rounded" />
              ) : (
                <div className="h-16 w-[45px] rounded bg-neutral-200" />
              )}
              <span>
                <strong className="text-neutral-900">{result.name}</strong>
                {result.year ? ` (${result.year})` : ''}
                <br />
                <small className="text-neutral-500">
                  {result.platforms.map((p) => p.abbreviation ?? p.name).join(', ') ||
                    'No platforms listed'}
                </small>
              </span>
            </button>
          </li>
        ))}
      </ul>

      {selected && (
        <div className={`mt-4 space-y-3 ${ADMIN_CARD}`}>
          <div className="flex gap-4">
            {selected.cover_url && (
              <img src={selected.cover_url} alt="" width={90} className="rounded" />
            )}
            <div>
              <strong className="text-neutral-900">{selected.name}</strong>
              {selected.year ? ` (${selected.year})` : ''}
            </div>
          </div>

          <div>
            <label className={ADMIN_LABEL}>Platform</label>
            <select
              value={platformId ?? ''}
              onChange={(e) => setPlatformId(e.target.value ? Number(e.target.value) : null)}
              className={ADMIN_INPUT}
            >
              <option value="">Unknown</option>
              {selected.platforms.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex gap-2">
            <button
              onClick={confirmAdd}
              disabled={createItem.isPending}
              className={ADMIN_BUTTON_PRIMARY}
            >
              {createItem.isPending ? 'Adding...' : 'Add'}
            </button>
            <button onClick={() => setSelected(null)} className={ADMIN_BUTTON_SECONDARY}>
              Cancel
            </button>
          </div>

          {createItem.isError && <p className="text-sm text-red-600">Failed to add item.</p>}
        </div>
      )}

      {addedItemIds.length > 0 && (
        <div className="mt-8">
          <h2 className="mb-2 text-lg font-semibold text-neutral-900">Added this session</h2>
          <ul className="space-y-1 text-sm text-neutral-600">
            {addedItemIds.map((id) => (
              <AddedItemStatus key={id} itemId={id} />
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}

function AddedItemStatus({ itemId }: { itemId: number }) {
  const { data: item } = useItemStatus(itemId)

  return (
    <li>
      {item?.title ?? `Item #${itemId}`} &mdash;{' '}
      {item ? SCRAPE_STATUS_LABEL[item.scrape_status] : '...'}
    </li>
  )
}
