import { useState, type FormEvent, type KeyboardEvent } from 'react'
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom'
import { useCollections } from '../api/collections'
import {
  ADMIN_BUTTON_DANGER,
  ADMIN_BUTTON_PRIMARY,
  ADMIN_BUTTON_SECONDARY,
  ADMIN_CARD,
  ADMIN_INPUT,
  ADMIN_LABEL,
  ADMIN_LINK,
} from '../components/Admin/adminUi'
import { ItemPhotoManager } from '../components/Admin/ItemPhotoManager'
import { WishlistAdminPanel } from '../components/Admin/WishlistAdminPanel'
import {
  useCompanyOptions,
  useFranchiseOptions,
  useGenreOptions,
  usePlatformOptions,
} from '../api/dictionaries'
import {
  SCRAPE_STATUS_LABEL,
  useDeleteItem,
  useItem,
  useRescrapeItem,
  useUpdateItem,
  type AcquiredDatePrecision,
  type ItemDetail,
} from '../api/items'
import { resolveReturnTo } from './resolveReturnTo'

/** US-112/113/114/115 -- WordPress-post-edit-style layout (main column +
 * sidebar), per REQUIREMENTS.md US-112. Minimal Tailwind pass (real
 * buttons, bordered inputs, white/gray block grouping) via
 * components/Admin/adminUi.ts -- see that file's docblock; admin visual
 * design beyond this is still an open item, see docs/tz/NEXT_STEPS.md.
 * Genre/Franchise/Developer/Publisher autocomplete uses native <datalist>
 * against api/dictionaries.ts rather than a custom widget. Photos
 * (US-117-120, ItemPhotoManager) and, when the item is currently in a
 * wishlist-type collection, the wishlist fields + mark-as-received flow
 * (US-150/151/162/163, WishlistAdminPanel) all mutate independently of this
 * form's Save/Delete -- each action calls its own endpoint immediately,
 * same "instant admin action" pattern as CollectionsAdmin/GiftersAdmin. */
export function AdminEditItemPage() {
  const { id } = useParams()
  const itemId = Number(id)
  const { data: item, isLoading, isError } = useItem(Number.isFinite(itemId) ? itemId : null)

  if (isLoading) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-8">
        <p className="text-neutral-500">Loading...</p>
      </div>
    )
  }

  if (isError || !item) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-8">
        <p className="mb-4">
          <Link to="/admin" className={ADMIN_LINK}>
            &larr; Back
          </Link>
        </p>
        <p className="text-neutral-500">Item not found.</p>
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
  const location = useLocation()
  const returnTo = (location.state as { from?: string } | null)?.from

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

    updateItem.mutate(
      {
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
      },
      { onSuccess: () => navigate(resolveReturnTo(returnTo, false)) },
    )
  }

  function handleDelete() {
    if (!window.confirm(`Delete "${item.title}"? This can't be undone.`)) return

    deleteItem.mutate(item.id, {
      onSuccess: () => navigate(resolveReturnTo(returnTo, true)),
    })
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <p className="mb-4">
        <Link to={returnTo ?? '/admin'} className={ADMIN_LINK}>
          &larr; Back
        </Link>
      </p>
      <h1 className="mb-6 text-2xl font-semibold text-neutral-900">Edit item</h1>

      <form onSubmit={handleSubmit} className="flex flex-col gap-6 sm:flex-row">
        {/* Main column */}
        <div className={`flex-[2] space-y-4 ${ADMIN_CARD}`}>
          <ItemPhotoManager
            itemId={item.id}
            igdbCoverUrl={item.igdb_cover_url}
            photos={item.photos}
          />

          <div>
            <label className={ADMIN_LABEL}>Title{edited('title')}</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              maxLength={500}
              className={ADMIN_INPUT}
            />
          </div>

          <div>
            <label className={ADMIN_LABEL}>Description{edited('description')}</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={5}
              className={ADMIN_INPUT}
            />
          </div>

          <div>
            <label className={ADMIN_LABEL}>Genres{edited('genres')}</label>
            <div className="mb-2 flex flex-wrap gap-1.5">
              {genres.map((name) => (
                <span
                  key={name}
                  className="flex items-center gap-1 rounded-full border border-neutral-300 bg-white px-2.5 py-0.5 text-sm text-neutral-700"
                >
                  {name}
                  <button
                    type="button"
                    onClick={() => setGenres(genres.filter((g) => g !== name))}
                    className="text-neutral-400 hover:text-red-600"
                    aria-label={`Remove ${name}`}
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
              className={ADMIN_INPUT}
            />
            <datalist id="genre-options">
              {genreOptions?.map((g) => (
                <option key={g.id} value={g.name} />
              ))}
            </datalist>
          </div>

          <div>
            <label className={ADMIN_LABEL}>Franchise{edited('franchise_id')}</label>
            <input
              type="text"
              list="franchise-options"
              value={franchiseName}
              onChange={(e) => setFranchiseName(e.target.value)}
              placeholder="None"
              className={ADMIN_INPUT}
            />
            <datalist id="franchise-options">
              {franchiseOptions?.map((f) => (
                <option key={f.id} value={f.name} />
              ))}
            </datalist>
          </div>

          <div className="flex gap-4">
            <div className="flex-1">
              <label className={ADMIN_LABEL}>Developer{edited('developer')}</label>
              <input
                type="text"
                list="company-options"
                value={developer}
                onChange={(e) => setDeveloper(e.target.value)}
                className={ADMIN_INPUT}
              />
            </div>
            <div className="flex-1">
              <label className={ADMIN_LABEL}>Publisher{edited('publisher')}</label>
              <input
                type="text"
                list="company-options"
                value={publisher}
                onChange={(e) => setPublisher(e.target.value)}
                className={ADMIN_INPUT}
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
        <div className={`flex-1 space-y-4 ${ADMIN_CARD}`}>
          <div>
            <label className={ADMIN_LABEL}>Platform</label>
            <select
              value={platformId ?? ''}
              onChange={(e) => setPlatformId(e.target.value ? Number(e.target.value) : null)}
              className={ADMIN_INPUT}
            >
              <option value="">Unknown</option>
              {platforms?.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            {/* US-114 -- moving an item between collections is just picking
                a different one here and saving. */}
            <label className={ADMIN_LABEL}>Collection</label>
            <select
              value={collectionId}
              onChange={(e) => setCollectionId(Number(e.target.value))}
              className={ADMIN_INPUT}
            >
              {collections?.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className={ADMIN_LABEL}>Acquired date</label>
            <select
              value={acquiredPrecision}
              onChange={(e) => setAcquiredPrecision(e.target.value as AcquiredDatePrecision | '')}
              className={`${ADMIN_INPUT} mb-2`}
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
                className={ADMIN_INPUT}
              />
            )}
          </div>

          <div>
            <label className={ADMIN_LABEL}>Purchase price (EUR)</label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={purchasePrice}
              onChange={(e) => setPurchasePrice(e.target.value)}
              className={ADMIN_INPUT}
            />
          </div>

          <div>
            <label className={ADMIN_LABEL}>Notes</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              className={ADMIN_INPUT}
            />
          </div>

          <div className="rounded-lg border border-neutral-200 bg-white p-3">
            <p className="mb-2 text-sm text-neutral-600">
              Scrape status:{' '}
              <strong className="text-neutral-900">
                {SCRAPE_STATUS_LABEL[item.scrape_status]}
              </strong>
            </p>
            <button
              type="button"
              onClick={() => rescrapeItem.mutate()}
              disabled={!item.igdb_id || rescrapeItem.isPending}
              title={item.igdb_id ? undefined : 'This item has no igdb_id (added manually)'}
              className={`${ADMIN_BUTTON_SECONDARY} w-full`}
            >
              {rescrapeItem.isPending ? 'Refreshing...' : 'Refresh metadata'}
            </button>
            {rescrapeItem.isError && (
              <p className="mt-2 text-sm text-red-600">Failed to trigger re-scrape.</p>
            )}
          </div>

          <div className="flex gap-2">
            <button type="submit" disabled={updateItem.isPending} className={ADMIN_BUTTON_PRIMARY}>
              {updateItem.isPending ? 'Saving...' : 'Save'}
            </button>
            <button
              type="button"
              onClick={handleDelete}
              disabled={deleteItem.isPending}
              className={ADMIN_BUTTON_DANGER}
            >
              Delete
            </button>
          </div>

          {updateItem.isSuccess && <p className="text-sm text-green-700">Saved.</p>}
          {updateItem.isError && (
            <p className="text-sm text-red-600">Failed to save -- try again.</p>
          )}
        </div>
      </form>

      {/* Outside the <form> above (nesting forms isn't valid HTML) -- its
          own mutations, independent of Save/Delete. Gated on the item's
          *current* saved collection, not whatever's picked (but not yet
          saved) in the Collection dropdown above. */}
      {collections?.some((c) => c.id === item.collection_id && c.is_wishlist) && (
        <div className="mt-6">
          <WishlistAdminPanel item={item} />
        </div>
      )}
    </div>
  )
}
