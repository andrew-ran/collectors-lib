import { useState } from 'react'
import { Link } from 'react-router-dom'
import { isAxiosError } from 'axios'
import { useCollections } from '../api/collections'
import { useIgdbSearch, type IgdbSearchResult } from '../api/igdb'
import { useCreateItem, useItemStatus, type ScrapeStatus } from '../api/items'
import { useDebouncedValue } from '../hooks/useDebouncedValue'

const STATUS_LABEL: Record<ScrapeStatus, string> = {
  pending: 'Scraping...',
  scraping: 'Scraping...',
  scraped: 'Ready',
  failed: 'Failed',
  manual: 'Ready',
}

/** US-110 -- IGDB search "add item" flow, Radarr/Sonarr-style:
 * pick a collection -> debounced search -> pick a result -> confirm
 * platform -> add. US-111's "Scraping..." -> "Ready" status is shown for
 * each item added this session. Deliberately unstyled (bare functional
 * layout) -- the design sprint only covered public-facing screens, admin
 * visual design is still open, see docs/tz/NEXT_STEPS.md. */
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
    <div style={{ maxWidth: 640, margin: '2rem auto', padding: '0 1rem' }}>
      <p>
        <Link to="/admin">&larr; Back</Link>
      </p>
      <h1>Add item (IGDB search)</h1>

      <div style={{ marginBottom: '1rem' }}>
        <label>
          Adding to:{' '}
          <select
            value={collectionId ?? ''}
            onChange={(e) => setCollectionIdOverride(Number(e.target.value))}
          >
            {collections?.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </label>
      </div>

      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search a game title..."
        style={{ width: '100%', padding: '0.5rem', boxSizing: 'border-box' }}
      />

      {isFetching && <p>Searching...</p>}

      {isSearchError && (
        <p style={{ color: 'crimson' }}>
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
        <p>No results.</p>
      )}

      <ul style={{ listStyle: 'none', padding: 0 }}>
        {results?.map((result) => (
          <li key={result.igdb_id}>
            <button
              onClick={() => selectResult(result)}
              style={{
                display: 'flex',
                gap: '0.75rem',
                alignItems: 'center',
                width: '100%',
                textAlign: 'left',
                padding: '0.5rem',
                margin: '0.25rem 0',
                cursor: 'pointer',
              }}
            >
              {result.cover_url ? (
                <img src={result.cover_url} alt="" width={45} />
              ) : (
                <div style={{ width: 45, height: 64, background: '#eee' }} />
              )}
              <span>
                <strong>{result.name}</strong>
                {result.year ? ` (${result.year})` : ''}
                <br />
                <small>
                  {result.platforms.map((p) => p.abbreviation ?? p.name).join(', ') ||
                    'No platforms listed'}
                </small>
              </span>
            </button>
          </li>
        ))}
      </ul>

      {selected && (
        <div style={{ border: '1px solid #ccc', padding: '1rem', marginTop: '1rem' }}>
          <div style={{ display: 'flex', gap: '1rem' }}>
            {selected.cover_url && <img src={selected.cover_url} alt="" width={90} />}
            <div>
              <strong>{selected.name}</strong>
              {selected.year ? ` (${selected.year})` : ''}
            </div>
          </div>

          <div style={{ margin: '0.75rem 0' }}>
            <label>
              Platform:{' '}
              <select
                value={platformId ?? ''}
                onChange={(e) => setPlatformId(e.target.value ? Number(e.target.value) : null)}
              >
                <option value="">Unknown</option>
                {selected.platforms.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <button onClick={confirmAdd} disabled={createItem.isPending}>
            {createItem.isPending ? 'Adding...' : 'Add'}
          </button>{' '}
          <button onClick={() => setSelected(null)}>Cancel</button>

          {createItem.isError && <p style={{ color: 'crimson' }}>Failed to add item.</p>}
        </div>
      )}

      {addedItemIds.length > 0 && (
        <div style={{ marginTop: '2rem' }}>
          <h2>Added this session</h2>
          <ul>
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
      {item ? STATUS_LABEL[item.scrape_status] : '...'}
    </li>
  )
}
