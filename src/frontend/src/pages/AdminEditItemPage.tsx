import { useState, type FormEvent, type KeyboardEvent } from 'react'
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom'
import { useCollections } from '../api/collections'
import {
  ADMIN_BUTTON_DANGER,
  ADMIN_BUTTON_PRIMARY,
  ADMIN_BUTTON_SECONDARY,
  ADMIN_CARD,
  ADMIN_DIVIDER,
  ADMIN_INPUT,
  ADMIN_LABEL,
  ADMIN_LINK,
  ADMIN_TAG_OUTLINE,
} from '../components/Admin/adminUi'
import { PriceCurrencyInput } from '../components/Admin/PriceCurrencyInput'
import { ItemPhotoManager } from '../components/Admin/ItemPhotoManager'
import { WishlistAdminPanel } from '../components/Admin/WishlistAdminPanel'
import { AdminLangSwitch } from '../components/Admin/AdminLangSwitch'
import { ArrowLeft, Book, Gamepad2, RefreshCw, Trash2, X } from '../components/Admin/icons'
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
import { useAdminLang } from '../hooks/adminLang'
import { resolveReturnTo } from './resolveReturnTo'

/** US-112/113/114/115 -- WordPress-post-edit-style layout (main column +
 * sidebar), per REQUIREMENTS.md US-112. For a book (item.type === 'book'),
 * the main column swaps Genres/Franchise/Developer for Author/Release year
 * instead (Publisher applies to both) -- this was a known gap, see
 * docs/tz/TECH_DEBT.md's "book's author isn't editable" entry for why it
 * wasn't there from the start. Photos (US-117-120, ItemPhotoManager) and,
 * when the item is currently in a wishlist-type collection, the wishlist
 * fields + mark-as-received flow (US-150/151/162/163, WishlistAdminPanel)
 * all mutate independently of this form's Save/Delete -- each action calls
 * its own endpoint immediately, same "instant admin action" pattern as
 * CollectionsAdmin/GiftersAdmin.
 *
 * 2026-08 redesign: rebuilt on the Modernist tokens from the Claude Design
 * handoff (docs/design/CLAUDE_DESIGN_BRIEF.md) -- replaces the earlier
 * "minimal Tailwind pass" (see git history). The item's entry type
 * (game/book) is shown as a static badge, not an interactive toggle like
 * the design prototype's demo switch: unlike the prototype, a real item's
 * type is fixed at creation (AdminAddItemPage vs AdminAddBookPage vs
 * AdminAddManualItemPage) and never changes here -- `isBook` below is a read
 * -only fact derived from `item.type`, not form state. Purchase price now
 * goes through PriceCurrencyInput (reuses useCurrency()'s convertToEur, see
 * that hook's docblock) instead of a bare EUR-only number field. */
export function AdminEditItemPage() {
  const { id } = useParams()
  const itemId = Number(id)
  const { data: item, isLoading, isError } = useItem(Number.isFinite(itemId) ? itemId : null)
  const { t } = useAdminLang()

  if (isLoading) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-8">
        <p className="text-[var(--admin-text-muted)]">{t.loading}</p>
      </div>
    )
  }

  if (isError || !item) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-8">
        <p className="mb-4">
          <Link to="/admin" className={ADMIN_LINK}>
            &larr; {t.backToList}
          </Link>
        </p>
        <p className="text-[var(--admin-text-muted)]">Item not found.</p>
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
  const { t } = useAdminLang()

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
  const isBook = item.type === 'book'
  const [author, setAuthor] = useState(item.metadata?.author ?? '')
  const [releaseYear, setReleaseYear] = useState(item.metadata?.release_year ?? '')

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
        author: isBook ? author || null : null,
        release_year: isBook && releaseYear ? Number(releaseYear) : null,
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
    <div className="mx-auto max-w-5xl px-6 py-8">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-4">
        <div>
          <Link
            to={returnTo ?? '/admin'}
            className={`${ADMIN_LINK} mb-2 inline-flex items-center gap-1`}
          >
            <ArrowLeft width={14} height={14} /> {t.backToList}
          </Link>
          <h1 className="text-2xl font-bold tracking-tight text-[var(--admin-text)]">
            {item.title}
          </h1>
          <p className="mt-0.5 text-sm text-[var(--admin-text-muted)]">
            {[
              item.platform?.name,
              isBook ? t.book : t.game,
              collections?.find((c) => c.id === item.collection_id)?.name,
            ]
              .filter(Boolean)
              .join(' · ')}
          </p>
        </div>
        <AdminLangSwitch />
      </div>

      <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-6 md:grid-cols-[2fr_1fr]">
        {/* Main column */}
        <div className={`flex flex-col gap-4 ${ADMIN_CARD}`}>
          <ItemPhotoManager
            itemId={item.id}
            igdbCoverUrl={item.igdb_cover_url}
            photos={item.photos}
          />

          <div>
            <label className={ADMIN_LABEL}>
              {t.title}
              {edited('title')}
            </label>
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
            <label className={ADMIN_LABEL}>
              {t.description}
              {edited('description')}
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={5}
              className={ADMIN_INPUT}
            />
          </div>

          {/* Static entry-type badge -- see this file's docblock for why
              it's not an interactive toggle like the design prototype's
              demo switch. */}
          <div className="flex items-center gap-1.5">
            {isBook ? <Book width={14} height={14} /> : <Gamepad2 width={14} height={14} />}
            <span className="text-xs font-medium text-[var(--admin-text-muted)]">
              {isBook ? t.book : t.game}
            </span>
          </div>

          {/* Genres/Franchise/Developer only apply to games -- a book has
              Author instead (see docs/tz/TECH_DEBT.md's now-resolved note
              on this). Publisher applies to both, so it's shared below. */}
          {!isBook && (
            <div className="border border-[var(--admin-divider)] p-3">
              <p className="mb-3 text-xs font-semibold tracking-wide text-[var(--admin-text-muted)] uppercase">
                {t.gameData}
              </p>
              <div className="mb-3">
                <label className={ADMIN_LABEL}>
                  {t.genres}
                  {edited('genres')}
                </label>
                <div className="mb-2 flex flex-wrap gap-1.5">
                  {genres.map((name) => (
                    <span key={name} className={ADMIN_TAG_OUTLINE}>
                      {name}
                      <button
                        type="button"
                        onClick={() => setGenres(genres.filter((g) => g !== name))}
                        className="text-[var(--admin-text-muted)] hover:text-[var(--admin-accent)]"
                        aria-label={`Remove ${name}`}
                      >
                        <X width={10} height={10} />
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
                  placeholder={t.addGenrePlaceholder}
                  className={ADMIN_INPUT}
                />
                <datalist id="genre-options">
                  {genreOptions?.map((g) => (
                    <option key={g.id} value={g.name} />
                  ))}
                </datalist>
              </div>

              <div>
                <label className={ADMIN_LABEL}>
                  {t.franchiseLabel}
                  {edited('franchise_id')}
                </label>
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

              <div className="mt-3">
                <label className={ADMIN_LABEL}>
                  {t.developer}
                  {edited('developer')}
                </label>
                <input
                  type="text"
                  list="company-options"
                  value={developer}
                  onChange={(e) => setDeveloper(e.target.value)}
                  className={ADMIN_INPUT}
                />
              </div>
            </div>
          )}

          {isBook && (
            <div className="border border-[var(--admin-divider)] p-3">
              <p className="mb-3 text-xs font-semibold tracking-wide text-[var(--admin-text-muted)] uppercase">
                {t.bookData}
              </p>
              <div className="flex gap-4">
                <div className="flex-1">
                  <label className={ADMIN_LABEL}>
                    {t.author}
                    {edited('author')}
                  </label>
                  <input
                    type="text"
                    value={author}
                    onChange={(e) => setAuthor(e.target.value)}
                    className={ADMIN_INPUT}
                  />
                </div>
                <div className="flex-1">
                  <label className={ADMIN_LABEL}>
                    {t.publicationYear}
                    {edited('release_year')}
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={9999}
                    value={releaseYear}
                    onChange={(e) => setReleaseYear(e.target.value)}
                    className={ADMIN_INPUT}
                  />
                </div>
              </div>
            </div>
          )}

          <div>
            <label className={ADMIN_LABEL}>
              {t.publisher}
              {edited('publisher')}
            </label>
            <input
              type="text"
              list="company-options"
              value={publisher}
              onChange={(e) => setPublisher(e.target.value)}
              className={ADMIN_INPUT}
            />
            <datalist id="company-options">
              {companyOptions?.map((name) => (
                <option key={name} value={name} />
              ))}
            </datalist>
          </div>
        </div>

        {/* Sidebar */}
        <div className={`flex flex-col gap-4 ${ADMIN_CARD}`}>
          <div>
            <label className={ADMIN_LABEL}>{t.platform}</label>
            <select
              value={platformId ?? ''}
              onChange={(e) => setPlatformId(e.target.value ? Number(e.target.value) : null)}
              className={ADMIN_INPUT}
            >
              <option value="">{t.unknown}</option>
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
            <label className={ADMIN_LABEL}>{t.collection}</label>
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
            <label className={ADMIN_LABEL}>{t.acquisitionDate}</label>
            <select
              value={acquiredPrecision}
              onChange={(e) => setAcquiredPrecision(e.target.value as AcquiredDatePrecision | '')}
              className={`${ADMIN_INPUT} mb-2`}
            >
              <option value="">{t.unknown}</option>
              <option value="day">{t.exactDay}</option>
              <option value="month">{t.monthYear}</option>
              <option value="year">{t.yearOnly}</option>
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
            <label className={ADMIN_LABEL}>{t.purchasePrice}</label>
            <PriceCurrencyInput eurValue={purchasePrice} onChangeEurValue={setPurchasePrice} />
          </div>

          <div>
            <label className={ADMIN_LABEL}>{t.notes}</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              className={ADMIN_INPUT}
            />
          </div>

          <div className="border border-[var(--admin-divider)] p-3">
            <p className="mb-2 text-sm text-[var(--admin-text-muted)]">
              {t.scrapeStatus}:{' '}
              <strong className="text-[var(--admin-text)]">
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
              <RefreshCw width={14} height={14} />
              {rescrapeItem.isPending ? 'Refreshing...' : t.refreshMetadata}
            </button>
            {rescrapeItem.isError && (
              <p className="mt-2 text-sm text-[var(--admin-accent-700)]">
                Failed to trigger re-scrape.
              </p>
            )}
          </div>

          <div className={ADMIN_DIVIDER} />
          <div className="flex gap-2">
            <button type="submit" disabled={updateItem.isPending} className={ADMIN_BUTTON_PRIMARY}>
              {updateItem.isPending ? t.saving : t.save}
            </button>
            <button
              type="button"
              onClick={handleDelete}
              disabled={deleteItem.isPending}
              className={ADMIN_BUTTON_DANGER}
            >
              <Trash2 width={14} height={14} /> {t.delete}
            </button>
          </div>

          {updateItem.isSuccess && <p className="text-sm text-[var(--admin-text)]">{t.saved}</p>}
          {updateItem.isError && (
            <p className="text-sm text-[var(--admin-accent-700)]">{t.saveFailed}</p>
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
