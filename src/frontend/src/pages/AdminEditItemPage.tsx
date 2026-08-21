import { useState, type FormEvent, type KeyboardEvent } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useCollections } from '../api/collections'
import {
  useCompanyOptions,
  useFranchiseOptions,
  useGenreOptions,
  usePlatformOptions,
} from '../api/dictionaries'
import {
  useDeleteItem,
  useItem,
  useRescrapeItem,
  useUpdateItem,
  type AcquiredDatePrecision,
  type ItemDetail,
  type ScrapeStatus,
} from '../api/items'

const STATUS_LABEL: Record<ScrapeStatus, string> = {
  pending: 'Scraping...',
  scraping: 'Scraping...',
  scraped: 'Ready',
  failed: 'Failed',
  manual: 'Ready',
}

/** US-112/113/114/115 -- WordPress-post-edit-style layout (main column +
 * sidebar), per REQUIREMENTS.md US-112. Deliberately unstyled/bare, same as
 * AdminAddItemPage -- admin visual design is still an open item, see
 * docs/tz/NEXT_STEPS.md. Genre/Franchise/Developer/Publisher autocomplete
 * uses native <datalist> against api/dictionaries.ts rather than a custom
 * widget, matching that "bare functional layout" elsewhere in the admin.
 * Photos (US-117-120) aren't here yet -- no admin upload flow exists to
 * test them against, see docs/tz/BACKLOG.md US-012. */
export function AdminEditItemPage() {
  const { id } = useParams()
  const itemId = Number(id)
  const { data: item, isLoading, isError } = useItem(Number.isFinite(itemId) ? itemId : null)

  if (isLoading) {
    return (
      <div style={{ maxWidth: 640, margin: '2rem auto', padding: '0 1rem' }}>
        <p>Loading...</p>
      </div>
    )
  }

  if (isError || !item) {
    return (
      <div style={{ maxWidth: 640, margin: '2rem auto', padding: '0 1rem' }}>
        <p>
          <Link to="/admin">&larr; Back</Link>
        </p>
        <p>Item not found.</p>
      </div>
    )
  }

  // Keyed by scraped_at -- a US-113 re-scrape changes item's fields
  // underneath this page (new description/franchise/genres from IGDB). The
  // form below seeds its local state once from `item` via plain useState
  // initializers (derived state on mount, not an effect -- same
  // react-hooks/set-state-in-effect reasoning as SiteSettingsAdmin), so
  // remounting on a fresh scraped_at is what makes a completed re-scrape
  // actually show up in the fields instead of the stale pre-scrape values.
  return <EditForm key={item.scraped_at ?? item.id} item={item} />
}

function EditForm({ item }: { item: ItemDetail }) {
  const navigate = useNavigate()
  const { data: collections } = useCollections()
  const { data: platforms } = usePlatformOptions()
  const { data: genreOptions } = useGenreOptions()
  const { data: franchiseOptions } = useFranchiseOptions()
  const { data: companyOptions } = useCompanyOptions()

  const updateItem = useUpdateItem(item.id)
  const rescrapeItem = useRescrapeItem(item.id)
  const deleteItem = useDeleteItem()

  const overrides = item.metadata?.manual_overrides ?? {}
  const edited = (field: string) => (overrides[field] ? ' (manually edited)' : '')

  const [title, setTitle] = useState(item.title)
  const [description, setDescription] = useState(item.metadata?.description ?? '')
  const [franchiseName, setFranchiseName] = useState(item.metadata?.franchise?.name ?? '')
  const [developer, setDeveloper] = useState(item.metadata?.developer ?? '')
  const [publisher, setPublisher] = useState(item.metadata?.publisher ?? '')
  const [genres, setGenres] = useState<string[]>(item.genres.map((g) => g.name))
  const [genreInput, setGenreInput] = useState('')

  const [collectionId, setCollectionId] = useState(item.collection_id)
  const [platformId, setPlatformId] = useState<number | null>(item.platform_id)
  // 'date' casts come back from Laravel as a full ISO datetime
  // ("2024-05-01T00:00:00.000000Z"), not the plain "YYYY-MM-DD" an
  // <input type="date"> needs -- slice off the date portion.
  const [acquiredDate, setAcquiredDate] = useState(item.acquired_date?.slice(0, 10) ?? '')
  const [acquiredPrecision, setAcquiredPrecision] = useState<AcquiredDatePrecision | ''>(
    item.acquired_date_precision ?? '',
  )
  const [purchasePrice, setPurchasePrice] = useState(item.purchase_price ?? '')
  const [notes, setNotes] = useState(item.notes ?? '')

  function addGenre() {
    const name = genreInput.trim()

    if (name && !genres.includes(name)) {
      setGenres([...genres, name])
    }

    setGenreInput('')
  }

  function handleGenreKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'Enter' || event.key === ',') {
      event.preventDefault()
      addGenre()
    }
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault()

    updateItem.mutate({
      collection_id: collectionId,
      type: item.type,
      igdb_id: item.igdb_id,
      custom_identifier: item.custom_identifier,
      title,
      subtitle: item.subtitle,
      platform_id: platformId,
      acquired_date: acquiredPrecision ? acquiredDate || null : null,
      acquired_date_precision: acquiredPrecision || null,
      purchase_price: purchasePrice || null,
      notes: notes || null,
      description: description || null,
      franchise_name: franchiseName || null,
      developer: developer || null,
      publisher: publisher || null,
      genres,
    })
  }

  function handleDelete() {
    if (!window.confirm(`Delete "${item.title}"? This can't be undone.`)) return

    deleteItem.mutate(item.id, { onSuccess: () => navigate('/admin') })
  }

  return (
    <div style={{ maxWidth: 900, margin: '2rem auto', padding: '0 1rem' }}>
      <p>
        <Link to="/admin">&larr; Back</Link>
      </p>
      <h1>Edit item</h1>

      <form onSubmit={handleSubmit} style={{ display: 'flex', gap: '2rem' }}>
        {/* Main column */}
        <div style={{ flex: 2, minWidth: 0 }}>
          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', marginBottom: '0.25rem' }}>
              Title{edited('title')}
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              maxLength={500}
              style={{ width: '100%', padding: '0.5rem', boxSizing: 'border-box' }}
            />
          </div>

          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', marginBottom: '0.25rem' }}>
              Description{edited('description')}
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={5}
              style={{ width: '100%', padding: '0.5rem', boxSizing: 'border-box' }}
            />
          </div>

          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', marginBottom: '0.25rem' }}>
              Genres{edited('genres')}
            </label>
            <div
              style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', marginBottom: '0.4rem' }}
            >
              {genres.map((name) => (
                <span
                  key={name}
                  style={{
                    background: '#eee',
                    borderRadius: 4,
                    padding: '0.15rem 0.5rem',
                    fontSize: '0.9rem',
                  }}
                >
                  {name}{' '}
                  <button
                    type="button"
                    onClick={() => setGenres(genres.filter((g) => g !== name))}
                    style={{ border: 'none', background: 'none', cursor: 'pointer' }}
                  >
                    &times;
                  </button>
                </span>
              ))}
            </div>
            <input
              type="text"
              list="genre-options"
              value={genreInput}
              onChange={(e) => setGenreInput(e.target.value)}
              onKeyDown={handleGenreKeyDown}
              onBlur={addGenre}
              placeholder="Type a genre, Enter to add"
              style={{ width: '100%', padding: '0.5rem', boxSizing: 'border-box' }}
            />
            <datalist id="genre-options">
              {genreOptions?.map((g) => (
                <option key={g.id} value={g.name} />
              ))}
            </datalist>
          </div>

          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', marginBottom: '0.25rem' }}>
              Franchise{edited('franchise_id')}
            </label>
            <input
              type="text"
              list="franchise-options"
              value={franchiseName}
              onChange={(e) => setFranchiseName(e.target.value)}
              placeholder="None"
              style={{ width: '100%', padding: '0.5rem', boxSizing: 'border-box' }}
            />
            <datalist id="franchise-options">
              {franchiseOptions?.map((f) => (
                <option key={f.id} value={f.name} />
              ))}
            </datalist>
          </div>

          <div style={{ display: 'flex', gap: '1rem' }}>
            <div style={{ flex: 1, marginBottom: '1rem' }}>
              <label style={{ display: 'block', marginBottom: '0.25rem' }}>
                Developer{edited('developer')}
              </label>
              <input
                type="text"
                list="company-options"
                value={developer}
                onChange={(e) => setDeveloper(e.target.value)}
                style={{ width: '100%', padding: '0.5rem', boxSizing: 'border-box' }}
              />
            </div>
            <div style={{ flex: 1, marginBottom: '1rem' }}>
              <label style={{ display: 'block', marginBottom: '0.25rem' }}>
                Publisher{edited('publisher')}
              </label>
              <input
                type="text"
                list="company-options"
                value={publisher}
                onChange={(e) => setPublisher(e.target.value)}
                style={{ width: '100%', padding: '0.5rem', boxSizing: 'border-box' }}
              />
            </div>
            <datalist id="company-options">
              {companyOptions?.map((name) => (
                <option key={name} value={name} />
              ))}
            </datalist>
          </div>
        </div>

        {/* Sidebar */}
        <div style={{ flex: 1, minWidth: 220 }}>
          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', marginBottom: '0.25rem' }}>Platform</label>
            <select
              value={platformId ?? ''}
              onChange={(e) => setPlatformId(e.target.value ? Number(e.target.value) : null)}
              style={{ width: '100%', padding: '0.4rem' }}
            >
              <option value="">Unknown</option>
              {platforms?.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>
          <div style={{ marginBottom: '1rem' }}>
            {/* US-114 -- moving an item between collections is just picking
                a different one here and saving. */}
            <label style={{ display: 'block', marginBottom: '0.25rem' }}>Collection</label>
            <select
              value={collectionId}
              onChange={(e) => setCollectionId(Number(e.target.value))}
              style={{ width: '100%', padding: '0.4rem' }}
            >
              {collections?.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', marginBottom: '0.25rem' }}>Acquired date</label>
            <select
              value={acquiredPrecision}
              onChange={(e) => setAcquiredPrecision(e.target.value as AcquiredDatePrecision | '')}
              style={{ width: '100%', padding: '0.4rem', marginBottom: '0.4rem' }}
            >
              <option value="">Unknown</option>
              <option value="day">Exact day</option>
              <option value="month">Month + year</option>
              <option value="year">Year only</option>
            </select>
            {acquiredPrecision && (
              <input
                type="date"
                value={acquiredDate}
                onChange={(e) => setAcquiredDate(e.target.value)}
                style={{ width: '100%', padding: '0.4rem', boxSizing: 'border-box' }}
              />
            )}
          </div>
          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', marginBottom: '0.25rem' }}>
              Purchase price (EUR)
            </label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={purchasePrice}
              onChange={(e) => setPurchasePrice(e.target.value)}
              style={{ width: '100%', padding: '0.4rem', boxSizing: 'border-box' }}
            />
          </div>
          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', marginBottom: '0.25rem' }}>Notes</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              style={{ width: '100%', padding: '0.4rem', boxSizing: 'border-box' }}
            />
          </div>
          <div style={{ marginBottom: '1rem', padding: '0.75rem', background: '#f7f7f7' }}>
            <p style={{ margin: '0 0 0.5rem' }}>
              Scrape status: <strong>{STATUS_LABEL[item.scrape_status]}</strong>
            </p>
            <button
              type="button"
              onClick={() => rescrapeItem.mutate()}
              disabled={!item.igdb_id || rescrapeItem.isPending}
              title={item.igdb_id ? undefined : 'This item has no igdb_id (added manually)'}
            >
              {rescrapeItem.isPending ? 'Refreshing...' : 'Refresh metadata'}
            </button>
            {rescrapeItem.isError && (
              <p style={{ color: 'crimson', margin: '0.5rem 0 0' }}>Failed to trigger re-scrape.</p>
            )}
          </div>
          <button type="submit" disabled={updateItem.isPending}>
            {updateItem.isPending ? 'Saving...' : 'Save'}
          </button>{' '}
          <button type="button" onClick={handleDelete} disabled={deleteItem.isPending}>
            Delete
          </button>
          {updateItem.isSuccess && <p style={{ color: 'green', margin: '0.5rem 0 0' }}>Saved.</p>}
          {updateItem.isError && (
            <p style={{ color: 'crimson', margin: '0.5rem 0 0' }}>Failed to save -- try again.</p>
          )}
        </div>
      </form>
    </div>
  )
}
