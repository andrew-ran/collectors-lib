import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import { Link, useLocation, useSearchParams } from 'react-router-dom'
import { useAuthStore } from '../stores/authStore'
import { useCollections, type Collection } from '../api/collections'
import {
  useCollectionItems,
  useFilterOptions,
  useItem,
  type ConditionPreference,
  type FilterOptions,
  type IgdbRef,
  type ItemDetail,
  type ItemSummary,
  type Priority,
  type RelatedGameRef,
  type SortOrder,
  type WishlistDetailRef,
} from '../api/items'
import { Dropdown, DropdownItem } from '../components/Dropdown'
import { CurrencyProvider } from '../hooks/CurrencyProvider'
import { CURRENCIES, CURRENCY_META, useCurrency } from '../hooks/currency'
import { useIsMobile } from '../hooks/useIsMobile'

/** US-030/031 -- mobile default is Table View; Item View is the desktop-
 * style stacked full-detail cards. Not URL-reflected (unlike collection/
 * filters/sort) -- the spec only calls out those as bookmarkable (US-008b),
 * and a view-mode preference is a lighter, more session-local choice. */
type MobileViewMode = 'table' | 'item'

/** US-034/011 -- id of the sticky mobile sort/filter bar, read by the
 * scroll-to-item logic to offset for its actual rendered height (it can
 * wrap to 2 lines depending on how many filters are active/available, so a
 * fixed guessed offset isn't reliable). */
const STICKY_BAR_ID = 'sort-filter-bar'

const SORT_LABELS: Record<SortOrder, string> = {
  newest: 'Newest added first',
  oldest: 'Oldest added first',
  az: 'A → Z',
  za: 'Z → A',
}

function toIntOrNull(value: string | null): number | null {
  if (!value) return null
  const n = Number(value)

  return Number.isFinite(n) ? n : null
}

/** US-001/001b/002/003/005/006/006a/007/008/008b/008c/009/010 -- the public
 * homepage: a collection's items shown one at a time, with a collection
 * switcher, Platform/Genre/Series filters, sort, arrow navigation, and a
 * position indicator. Filters/collection/sort are reflected in the URL
 * (US-008b) so a view can be bookmarked or shared.
 *
 * Also covers US-020/021/022/023: Wishlist-only fields (condition
 * preference, edition note, estimated price) and the priority badge on
 * Wishlist cards, plus the Gifted/Purchased acquisition badge once an item
 * has left the Wishlist for a regular collection.
 *
 * And US-011: Related (sequel/prequel/remake) tags show a hover tooltip and
 * are clickable when the target is owned/wishlisted, jumping to that game's
 * own card via the `item` URL param. Note: `sequels`/`prequels` themselves
 * are a franchise+release-date approximation, not a true IGDB relation --
 * see docs/tz/TECH_DEBT.md and the CHANGELOG.
 *
 * And US-030/031/032/033/034/035/036/037: below 768px, this switches to a
 * mobile Table View (default) or Item View (full-detail cards stacked
 * vertically), toggled from the sort/filter bar, which becomes sticky on
 * scroll on mobile. Table rows open a popup with the same fields/order as
 * Item View on tap. A floating scroll-to-top button appears once scrolled.
 *
 * And US-170/171: a currency selector (top of the interface, next to the
 * collection switcher) recalculates every displayed wishlist price on the
 * fly via useCurrency()'s cached /api/exchange-rates -- prices are always
 * stored in EUR, converted+rounded per currency (see hooks/currency.ts).
 *
 * Deliberately scoped down for this pass -- explicitly NOT included yet
 * (see docs/tz/BACKLOG.md Phase 2):
 * - US-012 photo slider/lightbox -- no admin-uploaded photos exist yet,
 *   just the single primary cover image
 * - Wishlist's Most/Least-wanted and Price sort options (US-009) -- the
 *   fields exist now, but the sort UI itself isn't wired up in this pass,
 *   so US-032's table columns for those two sorts aren't reachable yet
 *   (see docs/tz/TECH_DEBT.md)
 * - Real test data for the acquisition badge needs US-151 (mark received)
 *   to exist, or a manually seeded wishlist_details row + collection move
 * - Mobile Item View fetches each stacked card's full detail individually
 *   (same useItem() hook desktop uses) -- fine at "dozens to low hundreds"
 *   of items, but not lazy/virtualized -- see docs/tz/TECH_DEBT.md
 */
export function CollectionItemViewPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const isMobile = useIsMobile()
  const [mobileViewMode, setMobileViewMode] = useState<MobileViewMode>('table')
  // US-035 -- carries the row's position too, so the popup can show "Item N"
  // (US-036) without re-deriving it from the list.
  const [popupItem, setPopupItem] = useState<{ id: number; number: number } | null>(null)

  const collectionSlug = searchParams.get('collection')
  const platformId = toIntOrNull(searchParams.get('platform'))
  const genreId = toIntOrNull(searchParams.get('genre'))
  const franchiseId = toIntOrNull(searchParams.get('franchise'))
  const sort = (searchParams.get('sort') as SortOrder | null) ?? 'newest'
  // US-011 -- set when a Related tag was clicked; ItemBrowser resolves it
  // to a starting position once its item list has loaded.
  const itemIdParam = toIntOrNull(searchParams.get('item'))

  const { data: collections, isLoading: collectionsLoading } = useCollections()
  const collection =
    (collectionSlug && collections?.find((c) => c.slug === collectionSlug)) ||
    collections?.find((c) => c.is_default) ||
    collections?.[0] ||
    null

  const { data: filterOptions } = useFilterOptions(collection?.id ?? null)
  const hasActiveFilters = Boolean(platformId || genreId || franchiseId)

  function updateParams(patch: Record<string, string | null>) {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev)

      for (const [key, value] of Object.entries(patch)) {
        if (value === null) next.delete(key)
        else next.set(key, value)
      }

      return next
    })
  }

  function selectCollection(c: Collection) {
    updateParams({ collection: c.slug, platform: null, genre: null, franchise: null, item: null })
  }

  function resetFilters() {
    updateParams({ platform: null, genre: null, franchise: null })
  }

  if (collectionsLoading) {
    return <CenteredMessage>Loading...</CenteredMessage>
  }

  if (!collection) {
    return <CenteredMessage>No collections yet.</CenteredMessage>
  }

  return (
    <CurrencyProvider>
      <div className="mx-auto flex min-h-screen max-w-5xl flex-col items-center gap-6 px-4 py-10">
        {/* US-034 -- collection name/switcher is never sticky, on mobile or
            desktop. Wrapped in its own elevated stacking context (z-30) so
            its dropdown always paints above the sticky sort/filter bar (z-20)
            below it, regardless of DOM order -- otherwise the sticky bar's
            own stacking context would sit on top of it once scrolled.
            US-170's currency selector lives here too -- "top of the
            interface", per spec, and not gated to Wishlist collections so it
            doesn't appear/disappear as you switch collections; it's simply
            inert (nothing to convert) outside the Wishlist. */}
        <div className="relative z-30 flex w-full items-center justify-between gap-2">
          <CollectionSwitcher
            collections={collections ?? []}
            current={collection}
            onSelect={selectCollection}
          />
          <CurrencySelector />
        </div>

        {/* US-034 -- only the mobile sort/filter bar becomes sticky once
          scrolled; desktop's stays in normal flow. id is read by the
          US-011 mobile scroll-to-item logic below, to offset for its
          actual (variable, can wrap to 2 lines) rendered height. */}
        <div
          id={STICKY_BAR_ID}
          className={
            isMobile ? 'sticky top-0 z-20 w-full bg-white/95 py-2 backdrop-blur' : 'w-full'
          }
        >
          <FilterSortBar
            options={filterOptions}
            platformId={platformId}
            genreId={genreId}
            franchiseId={franchiseId}
            sort={sort}
            onPlatformChange={(id) => updateParams({ platform: id })}
            onGenreChange={(id) => updateParams({ genre: id })}
            onFranchiseChange={(id) => updateParams({ franchise: id })}
            onSortChange={(value) => updateParams({ sort: value === 'newest' ? null : value })}
            mobileViewMode={isMobile ? mobileViewMode : null}
            onMobileViewModeChange={setMobileViewMode}
          />
        </div>

        {isMobile ? (
          <MobileCollectionView
            collectionId={collection.id}
            isWishlist={collection.is_wishlist}
            viewMode={mobileViewMode}
            initialItemId={itemIdParam}
            platformId={platformId}
            genreId={genreId}
            franchiseId={franchiseId}
            sort={sort}
            hasActiveFilters={hasActiveFilters}
            onResetFilters={resetFilters}
            onSelectItem={(id, number) => setPopupItem({ id, number })}
          />
        ) : (
          // Remounts (resetting the browser's local position state) whenever
          // collection/filters/sort change -- covers both clicks here and
          // direct URL/back-button navigation, without an effect+setState.
          <ItemBrowser
            key={`${collection.id}-${platformId ?? ''}-${genreId ?? ''}-${franchiseId ?? ''}-${sort}-${itemIdParam ?? ''}`}
            collectionId={collection.id}
            isWishlist={collection.is_wishlist}
            initialItemId={itemIdParam}
            platformId={platformId}
            genreId={genreId}
            franchiseId={franchiseId}
            sort={sort}
            hasActiveFilters={hasActiveFilters}
            onResetFilters={resetFilters}
          />
        )}

        {/* US-035 -- Table View row tap opens the same fields/order as Item
          View, in a popup. */}
        {popupItem !== null && (
          <ItemDetailPopup
            itemId={popupItem.id}
            itemNumber={popupItem.number}
            isWishlist={collection.is_wishlist}
            onClose={() => setPopupItem(null)}
          />
        )}

        {isMobile && <ScrollToTopButton />}
      </div>
    </CurrencyProvider>
  )
}

function ItemBrowser({
  collectionId,
  isWishlist,
  initialItemId,
  platformId,
  genreId,
  franchiseId,
  sort,
  hasActiveFilters,
  onResetFilters,
}: {
  collectionId: number
  isWishlist: boolean
  initialItemId: number | null
  platformId: number | null
  genreId: number | null
  franchiseId: number | null
  sort: SortOrder
  hasActiveFilters: boolean
  onResetFilters: () => void
}) {
  const { data: itemsPage } = useCollectionItems(collectionId, {
    platformId,
    genreId,
    franchiseId,
    sort,
  })
  const items = itemsPage?.data ?? []
  const total = itemsPage?.total ?? 0

  const [index, setIndex] = useState(0)
  // US-011 -- once a Related tag jump has been consumed (by any manual
  // arrow nav), we stop overriding index with the jump target. Starts
  // already-consumed when there's nothing to jump to. Purely derived from
  // `items` each render (no effect needed) -- once the async item list
  // arrives, the target position just falls out of this computation.
  const [hasJumped, setHasJumped] = useState(initialItemId === null)
  const targetIndex = hasJumped ? -1 : items.findIndex((i) => i.id === initialItemId)
  const effectiveIndex = targetIndex >= 0 ? targetIndex : index
  const clampedIndex = Math.min(effectiveIndex, Math.max(items.length - 1, 0))
  const currentId = items[clampedIndex]?.id ?? null

  const { data: item } = useItem(currentId)

  const goPrev = useCallback(() => {
    setHasJumped(true)
    setIndex(Math.max(effectiveIndex - 1, 0))
  }, [effectiveIndex])
  const goNext = useCallback(() => {
    setHasJumped(true)
    setIndex(Math.min(effectiveIndex + 1, items.length - 1))
  }, [effectiveIndex, items.length])

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'ArrowLeft') goPrev()
      if (e.key === 'ArrowRight') goNext()
    }

    window.addEventListener('keydown', onKeyDown)

    return () => window.removeEventListener('keydown', onKeyDown)
  }, [goPrev, goNext])

  if (itemsPage && total === 0) {
    return <EmptyState hasActiveFilters={hasActiveFilters} onResetFilters={onResetFilters} />
  }

  return (
    <>
      <p className="text-sm text-neutral-500">{total} item(s)</p>

      <div className="flex w-full flex-1 items-center justify-center gap-3 sm:gap-6">
        <NavButton direction="prev" onClick={goPrev} disabled={clampedIndex === 0} />

        {item ? <ItemCard item={item} isWishlist={isWishlist} /> : <ItemCardSkeleton />}

        <NavButton direction="next" onClick={goNext} disabled={clampedIndex >= items.length - 1} />
      </div>

      <p className="text-sm text-neutral-500">
        Item {total === 0 ? 0 : clampedIndex + 1} of {total}
      </p>
    </>
  )
}

function CenteredMessage({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center text-neutral-500">{children}</div>
  )
}

function EmptyState({
  hasActiveFilters,
  onResetFilters,
}: {
  hasActiveFilters: boolean
  onResetFilters: () => void
}) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-2 text-center">
      {hasActiveFilters ? (
        <>
          <p className="text-neutral-500">No items match these filters.</p>
          <button
            type="button"
            onClick={onResetFilters}
            className="text-sm font-medium text-neutral-900 underline underline-offset-2"
          >
            Reset filters
          </button>
        </>
      ) : (
        <p className="text-neutral-500">No items yet.</p>
      )}
    </div>
  )
}

/** US-001b -- button next to the collection name opens a dropdown of every
 * collection. */
function CollectionSwitcher({
  collections,
  current,
  onSelect,
}: {
  collections: Collection[]
  current: Collection
  onSelect: (collection: Collection) => void
}) {
  return (
    <Dropdown
      trigger={current.name}
      triggerClassName="flex items-center gap-1.5 rounded-full border border-transparent px-2 py-1 text-xl font-semibold text-neutral-900 transition hover:border-neutral-200 hover:bg-neutral-50"
    >
      {(close) => (
        <ul>
          {collections.map((c) => (
            <li key={c.id}>
              <DropdownItem
                active={c.id === current.id}
                onClick={() => {
                  onSelect(c)
                  close()
                }}
              >
                {c.name}
              </DropdownItem>
            </li>
          ))}
        </ul>
      )}
    </Dropdown>
  )
}

/** US-170 -- pill button (flag + 3-letter code) at the top of the
 * interface. Picking a currency immediately recalculates every displayed
 * price (US-171) -- there's nothing to fetch on change, useCurrency()'s
 * formatPrice() just uses the already-cached rates. Currencies without a
 * cached rate yet aren't offered (US-006a's disabled-list-item pattern),
 * rather than showing a currency that can't actually convert anything. */
function CurrencySelector() {
  const { currency, setCurrency, availableCurrencies } = useCurrency()
  const meta = CURRENCY_META[currency]

  return (
    <Dropdown
      trigger={
        <span className="flex items-center gap-1">
          <span>{meta.flag}</span>
          <span>{currency}</span>
        </span>
      }
    >
      {(close) => (
        <ul>
          {CURRENCIES.map((c) => (
            <li key={c}>
              <DropdownItem
                active={c === currency}
                disabled={!availableCurrencies.includes(c)}
                onClick={() => {
                  setCurrency(c)
                  close()
                }}
              >
                <span className="flex items-center gap-1.5">
                  <span>{CURRENCY_META[c].flag}</span>
                  <span>{c}</span>
                </span>
              </DropdownItem>
            </li>
          ))}
        </ul>
      )}
    </Dropdown>
  )
}

/** US-006/006a/009 -- Platform/Genre/Series filter tags + the sort
 * dropdown. Each filter is grayed out (US-006a's disabled state) when the
 * current collection has zero items with any value for that dimension. */
function FilterSortBar({
  options,
  platformId,
  genreId,
  franchiseId,
  sort,
  onPlatformChange,
  onGenreChange,
  onFranchiseChange,
  onSortChange,
  mobileViewMode,
  onMobileViewModeChange,
}: {
  options: FilterOptions | undefined
  platformId: number | null
  genreId: number | null
  franchiseId: number | null
  sort: SortOrder
  onPlatformChange: (id: string | null) => void
  onGenreChange: (id: string | null) => void
  onFranchiseChange: (id: string | null) => void
  onSortChange: (value: SortOrder) => void
  /** US-031/034 -- null on desktop, which has no Table View and therefore
   * no toggle at all in v1. */
  mobileViewMode: MobileViewMode | null
  onMobileViewModeChange: (mode: MobileViewMode) => void
}) {
  const platform = options?.platforms.find((p) => p.id === platformId)
  const genre = options?.genres.find((g) => g.id === genreId)
  const franchise = options?.franchises.find((f) => f.id === franchiseId)

  return (
    <div className="flex flex-wrap items-center justify-center gap-2">
      <Dropdown trigger={platform?.name ?? 'Platform'} disabled={!options?.platforms.length}>
        {(close) => (
          <ul>
            <li>
              <DropdownItem
                active={!platformId}
                onClick={() => {
                  onPlatformChange(null)
                  close()
                }}
              >
                All platforms
              </DropdownItem>
            </li>
            {options?.platforms.map((p) => (
              <li key={p.id}>
                <DropdownItem
                  active={p.id === platformId}
                  onClick={() => {
                    onPlatformChange(String(p.id))
                    close()
                  }}
                >
                  {p.name}
                </DropdownItem>
              </li>
            ))}
          </ul>
        )}
      </Dropdown>

      <Dropdown trigger={genre?.name ?? 'Genre'} disabled={!options?.genres.length}>
        {(close) => (
          <ul>
            <li>
              <DropdownItem
                active={!genreId}
                onClick={() => {
                  onGenreChange(null)
                  close()
                }}
              >
                All genres
              </DropdownItem>
            </li>
            {options?.genres.map((g) => (
              <li key={g.id}>
                <DropdownItem
                  active={g.id === genreId}
                  onClick={() => {
                    onGenreChange(String(g.id))
                    close()
                  }}
                >
                  {g.name}
                </DropdownItem>
              </li>
            ))}
          </ul>
        )}
      </Dropdown>

      <Dropdown trigger={franchise?.name ?? 'Series'} disabled={!options?.franchises.length}>
        {(close) => (
          <ul>
            <li>
              <DropdownItem
                active={!franchiseId}
                onClick={() => {
                  onFranchiseChange(null)
                  close()
                }}
              >
                All series
              </DropdownItem>
            </li>
            {options?.franchises.map((f) => (
              <li key={f.id}>
                <DropdownItem
                  active={f.id === franchiseId}
                  onClick={() => {
                    onFranchiseChange(String(f.id))
                    close()
                  }}
                >
                  {f.name}
                </DropdownItem>
              </li>
            ))}
          </ul>
        )}
      </Dropdown>

      <Dropdown trigger={SORT_LABELS[sort]}>
        {(close) => (
          <ul>
            {(Object.keys(SORT_LABELS) as SortOrder[]).map((value) => (
              <li key={value}>
                <DropdownItem
                  active={value === sort}
                  onClick={() => {
                    onSortChange(value)
                    close()
                  }}
                >
                  {SORT_LABELS[value]}
                </DropdownItem>
              </li>
            ))}
          </ul>
        )}
      </Dropdown>

      {mobileViewMode !== null && (
        <MobileViewToggle mode={mobileViewMode} onChange={onMobileViewModeChange} />
      )}
    </div>
  )
}

/** US-031 -- Table View (default) / Item View toggle, mobile only. */
function MobileViewToggle({
  mode,
  onChange,
}: {
  mode: MobileViewMode
  onChange: (mode: MobileViewMode) => void
}) {
  return (
    <div className="inline-flex rounded-full border border-neutral-200 bg-white p-0.5 text-sm">
      {(['table', 'item'] as const).map((value) => (
        <button
          key={value}
          type="button"
          onClick={() => onChange(value)}
          className={`rounded-full px-3 py-1 transition ${
            mode === value ? 'bg-neutral-900 text-white' : 'text-neutral-600 hover:bg-neutral-50'
          }`}
        >
          {value === 'table' ? 'Table' : 'Item'}
        </button>
      ))}
    </div>
  )
}

function NavButton({
  direction,
  onClick,
  disabled,
}: {
  direction: 'prev' | 'next'
  onClick: () => void
  disabled: boolean
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={direction === 'prev' ? 'Previous item' : 'Next item'}
      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-neutral-200 bg-white text-neutral-600 shadow-sm transition hover:bg-neutral-50 disabled:cursor-not-allowed disabled:opacity-30 sm:h-12 sm:w-12"
    >
      {direction === 'prev' ? (
        <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5">
          <path
            d="M15 18l-6-6 6-6"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      ) : (
        <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5">
          <path
            d="M9 6l6 6-6 6"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      )}
    </button>
  )
}

const CONDITION_LABELS: Record<ConditionPreference, string> = {
  new_only: 'New only',
  used_ok: 'Used is OK',
  cartridge_only: 'Cartridge only (no box)',
}

/** US-112 -- a logged-in admin browsing the public site (this page is
 * public/unauthenticated, unlike everything under /admin) gets a small Edit
 * link straight to that item's edit form. Nothing renders for a visitor
 * (no token) -- this is just a shortcut, not a permission check; the real
 * gate is ProtectedRoute on /admin/items/:id/edit itself. */
/** Pinned to the top-right corner of the card (its parent must be
 * `relative`) rather than sitting inline next to the title -- stays in the
 * same spot regardless of title length and doesn't push any other card
 * content around. */
function AdminEditLink({ itemId }: { itemId: number }) {
  const token = useAuthStore((state) => state.token)
  const location = useLocation()

  if (!token) return null

  return (
    <Link
      to={`/admin/items/${itemId}/edit`}
      // AdminEditItemPage reads this back to return here (this exact
      // collection/filters/sort/item) after Save/Delete, instead of always
      // landing on /admin -- see resolveReturnTo() there.
      state={{ from: `${location.pathname}${location.search}` }}
      className="absolute top-3 right-3 z-10 rounded-full border border-neutral-200 bg-white/90 px-2.5 py-1 text-xs font-medium text-neutral-600 shadow-sm backdrop-blur-sm hover:border-neutral-300 hover:text-neutral-900"
    >
      Edit
    </Link>
  )
}

function ItemCard({ item, isWishlist }: { item: ItemDetail; isWishlist: boolean }) {
  const meta = item.metadata
  const wishlist = item.wishlist_detail

  // US-020/021 -- mutually exclusive per the spec: an item either still
  // wants (Wishlist -> priority badge) or has already been acquired
  // (moved to a regular collection -> acquisition badge), never both.
  const showPriorityBadge = isWishlist && wishlist?.priority
  const showAcquisitionBadge = !isWishlist && wishlist?.received

  return (
    <div className="relative flex w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-sm sm:flex-row">
      <AdminEditLink itemId={item.id} />

      <div className="relative aspect-[3/4] w-full shrink-0 bg-neutral-100 sm:w-64">
        {item.cover_url ? (
          <img src={item.cover_url} alt={item.title} className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-sm text-neutral-400">
            No cover
          </div>
        )}

        {showPriorityBadge && wishlist && (
          <PriorityBadge
            priority={wishlist.priority as Priority}
            desireScore={wishlist.desire_score ?? 0}
          />
        )}
        {showAcquisitionBadge && wishlist && <AcquisitionBadge detail={wishlist} />}
      </div>

      <div className="flex flex-1 flex-col gap-3 p-5">
        <div>
          <h2 className="text-2xl font-semibold text-neutral-900">{item.title}</h2>
          <p className="mt-0.5 text-sm text-neutral-500">
            {[item.platform?.name, meta?.release_year].filter(Boolean).join(' · ')}
          </p>
        </div>

        {item.genres.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {item.genres.map((genre) => (
              <span
                key={genre.id}
                className="rounded-full bg-neutral-100 px-2.5 py-0.5 text-xs text-neutral-600"
              >
                {genre.name}
              </span>
            ))}
          </div>
        )}

        {meta?.description && (
          <p className="line-clamp-5 text-sm leading-relaxed text-neutral-600">
            {meta.description}
          </p>
        )}

        {meta?.franchise && (
          <p className="text-sm text-neutral-500">
            Franchise: <span className="text-neutral-700">{meta.franchise.name}</span>
          </p>
        )}

        {meta && meta.other_platforms.length > 0 && (
          <TagRow label="Available on" tags={meta.other_platforms} />
        )}

        {meta &&
          (meta.sequels.length > 0 || meta.prequels.length > 0 || meta.remakes.length > 0) && (
            <RelatedTagRow prequels={meta.prequels} sequels={meta.sequels} remakes={meta.remakes} />
          )}

        {isWishlist && wishlist && <WishlistFields detail={wishlist} />}
      </div>
    </div>
  )
}

/** US-020 -- the Wishlist-only fields shown alongside the US-010 base info:
 * condition preference, a free-text edition note, and estimated price. */
function WishlistFields({ detail }: { detail: WishlistDetailRef }) {
  const { formatPrice } = useCurrency()
  const hasPriceEstimate = detail.price_new_estimate !== null || detail.price_used_estimate !== null

  if (!detail.condition_preference && !detail.edition_note && !hasPriceEstimate) {
    return null
  }

  return (
    <div className="flex flex-col gap-1 border-t border-neutral-100 pt-3 text-sm text-neutral-600">
      {detail.condition_preference && (
        <p>
          Condition:{' '}
          <span className="text-neutral-800">{CONDITION_LABELS[detail.condition_preference]}</span>
        </p>
      )}
      {detail.edition_note && (
        <p>
          Note: <span className="text-neutral-800">{detail.edition_note}</span>
        </p>
      )}
      {hasPriceEstimate && (
        <p>
          Est. price:{' '}
          <span className="text-neutral-800">
            {[
              detail.price_new_estimate && `new ${formatPrice(detail.price_new_estimate)}`,
              detail.price_used_estimate && `used ${formatPrice(detail.price_used_estimate)}`,
            ]
              .filter(Boolean)
              .join(' · ')}
          </span>
        </p>
      )}
    </div>
  )
}

const PRIORITY_ICON: Record<Priority, string> = {
  low: '🧊',
  medium: '🟠',
  high: '☄️',
}

/** US-020/023 -- circular badge over the cover's bottom-left corner.
 * Clicking expands the circle into a pill showing the exact desire score
 * as a percentage; clicking again collapses it back to just the icon.
 * Click-based (not hover) so it behaves the same on touch and desktop. */
function PriorityBadge({ priority, desireScore }: { priority: Priority; desireScore: number }) {
  const [expanded, setExpanded] = useState(false)

  return (
    <button
      type="button"
      onClick={() => setExpanded((e) => !e)}
      aria-label={`Priority: ${priority}`}
      className={`absolute bottom-2 left-2 flex h-9 cursor-pointer items-center gap-1.5 rounded-full border border-white/70 bg-neutral-900/80 text-white shadow-md backdrop-blur transition-all ${
        expanded ? 'px-3' : 'w-9 justify-center px-0'
      }`}
    >
      <span className="text-base leading-none">{PRIORITY_ICON[priority]}</span>
      {expanded && <span className="text-xs font-medium whitespace-nowrap">{desireScore}%</span>}
    </button>
  )
}

/** US-021/022 -- shown only once an item has left the Wishlist for a
 * regular collection (wishlist_detail.received === true). Three states:
 * a registered gifter (avatar, hover tooltip with their name, click expands
 * to a pill with the thank-you note), a gift with no gifter on file (gift
 * box icon, tooltip only, not interactive), or a self-purchase (wallet +
 * checkmark, tooltip only, not interactive). Mutually exclusive with
 * PriorityBadge -- same card position, see US-021's spec note. */
function AcquisitionBadge({ detail }: { detail: WishlistDetailRef }) {
  const [expanded, setExpanded] = useState(false)
  const [hovered, setHovered] = useState(false)

  const gifted = detail.acquisition_type === 'gifted'
  const gifter = gifted ? detail.gifter : null
  // Only the "registered gifter" state expands -- per spec, both the
  // no-gifter-on-file and self-purchased states are tooltip-only.
  const expandable = Boolean(gifter)

  let icon: ReactNode
  let tooltip: string

  if (gifter) {
    icon = gifter.avatar_url ? (
      <img src={gifter.avatar_url} alt="" className="h-full w-full rounded-full object-cover" />
    ) : (
      <span className="text-base leading-none">🎁</span>
    )
    tooltip = gifter.name
  } else if (gifted) {
    icon = <span className="text-base leading-none">🎁</span>
    tooltip = detail.gifter_name_override ?? 'Gifted'
  } else {
    icon = (
      <span className="relative flex h-full w-full items-center justify-center text-base leading-none">
        👛
        <span className="absolute -right-0.5 -bottom-0.5 flex h-3 w-3 items-center justify-center rounded-full bg-green-500 text-[8px] leading-none text-white">
          ✓
        </span>
      </span>
    )
    tooltip = 'Purchased'
  }

  return (
    <div className="absolute bottom-2 left-2">
      {hovered && !expanded && (
        <div className="absolute bottom-full left-0 mb-1.5 rounded-xl rounded-bl-none border border-neutral-200 bg-white px-2.5 py-1 text-xs whitespace-nowrap text-neutral-700 shadow-md">
          {tooltip}
        </div>
      )}

      <button
        type="button"
        onClick={() => expandable && setExpanded((e) => !e)}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        aria-label={tooltip}
        className={`flex h-9 items-center gap-1.5 overflow-hidden rounded-full border border-white/70 bg-neutral-900/80 text-white shadow-md backdrop-blur transition-all ${
          expandable ? 'cursor-pointer' : 'cursor-default'
        } ${expanded ? 'px-3' : 'w-9 justify-center px-0'}`}
      >
        <span className="flex h-6 w-6 shrink-0 items-center justify-center">{icon}</span>
        {expanded && detail.thank_you_note && (
          <span className="text-xs whitespace-nowrap">{detail.thank_you_note}</span>
        )}
      </button>
    </div>
  )
}

function TagRow({ label, tags }: { label: string; tags: IgdbRef[] }) {
  return (
    <div className="text-sm">
      <span className="text-neutral-500">{label}: </span>
      <span className="text-neutral-700">
        {tags.map((tag) => tag.abbreviation ?? tag.name).join(', ')}
      </span>
    </div>
  )
}

const STATUS_TOOLTIP: Record<RelatedGameRef['status'], string | null> = {
  unowned: 'не в коллекции',
  wishlisted: 'Wishlisted',
  // The checkmark itself communicates "owned" (US-011); no bubble text.
  owned: null,
}

// US-011 follow-up -- with the franchise+date approximation, a long-running
// franchise can return a long sequels/prequels list and stretch the card
// (see docs/tz/TECH_DEBT.md). By default only the closest entries on each
// side are shown, plus anything already owned (so a visitor never misses
// something they have); "Show more" reveals the rest.
const NEAREST_RELATED_COUNT = 2

/** Keeps a chronologically-sourced array's relative order, filtering down
 * to its closest `NEAREST_RELATED_COUNT` entries to the current game (the
 * last N for prequels, first N for sequels -- both arrays already arrive
 * sorted oldest-to-newest, see IgdbService::gamesInFranchise()) plus any
 * entry the visitor already owns, regardless of distance. */
function pickNearestOrOwned(games: RelatedGameRef[], nearest: RelatedGameRef[]): RelatedGameRef[] {
  const nearestIds = new Set(nearest.map((g) => g.id))

  return games.filter((g) => nearestIds.has(g.id) || g.status === 'owned')
}

function RelatedTagRow({
  prequels,
  sequels,
  remakes,
}: {
  prequels: RelatedGameRef[]
  sequels: RelatedGameRef[]
  remakes: RelatedGameRef[]
}) {
  const [expanded, setExpanded] = useState(false)

  const compactPrequels = pickNearestOrOwned(prequels, prequels.slice(-NEAREST_RELATED_COUNT))
  const compactSequels = pickNearestOrOwned(sequels, sequels.slice(0, NEAREST_RELATED_COUNT))

  const compact = [...compactPrequels, ...compactSequels, ...remakes]
  const full = [...prequels, ...sequels, ...remakes]
  const visible = expanded ? full : compact
  const hasMore = !expanded && full.length > compact.length

  return (
    <div className="text-sm">
      <span className="text-neutral-500">Related: </span>
      <span className="inline-flex flex-wrap items-center gap-1.5 align-middle">
        {visible.map((game, i) => (
          <RelatedTag key={`${game.status}-${game.id}-${i}`} game={game} />
        ))}
        {hasMore && (
          <button
            type="button"
            onClick={() => setExpanded(true)}
            className="text-xs font-medium text-neutral-500 underline underline-offset-2 hover:text-neutral-800"
          >
            Show more
          </button>
        )}
      </span>
    </div>
  )
}

/** US-011 -- hovering shows a comic-book-style speech-bubble tooltip; the
 * exact text/behavior depends on whether the related game is owned,
 * wishlisted, or neither. Owned/wishlisted tags are clickable and jump to
 * that game's own card (in its own collection) via the `item` URL param
 * ItemBrowser resolves. `sequels`/`prequels` are a franchise+release-date
 * approximation, not a true IGDB relation -- see docs/tz/TECH_DEBT.md. */
function RelatedTag({ game }: { game: RelatedGameRef }) {
  const [, setSearchParams] = useSearchParams()
  const [hovered, setHovered] = useState(false)

  const clickable =
    game.status !== 'unowned' && game.item_id !== null && game.collection_slug !== null
  const tooltip = STATUS_TOOLTIP[game.status]

  function handleClick() {
    if (!clickable || !game.collection_slug || game.item_id === null) return

    setSearchParams((prev) => {
      const next = new URLSearchParams(prev)
      next.set('collection', game.collection_slug as string)
      next.set('item', String(game.item_id))
      next.delete('platform')
      next.delete('genre')
      next.delete('franchise')

      return next
    })
  }

  return (
    <span className="relative inline-block">
      {hovered && tooltip && (
        <span className="absolute bottom-full left-0 z-10 mb-1.5 rounded-xl rounded-bl-none border border-neutral-200 bg-white px-2.5 py-1 text-xs whitespace-nowrap text-neutral-700 shadow-md">
          {tooltip}
        </span>
      )}

      <button
        type="button"
        onClick={handleClick}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        disabled={!clickable}
        className={`inline-flex items-center gap-1 rounded-full bg-neutral-100 px-2.5 py-0.5 text-xs text-neutral-600 transition ${
          clickable ? 'cursor-pointer hover:bg-neutral-200' : 'cursor-default'
        }`}
      >
        {game.name}
        {game.status === 'owned' && (
          <span className="flex h-3.5 w-3.5 items-center justify-center rounded-full bg-green-500 text-[8px] leading-none text-white">
            ✓
          </span>
        )}
      </button>
    </span>
  )
}

function ItemCardSkeleton() {
  return (
    <div className="flex w-full max-w-3xl animate-pulse flex-col overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-sm sm:flex-row">
      <div className="aspect-[3/4] w-full shrink-0 bg-neutral-100 sm:w-64" />
      <div className="flex flex-1 flex-col gap-3 p-5">
        <div className="h-6 w-2/3 rounded bg-neutral-100" />
        <div className="h-4 w-1/3 rounded bg-neutral-100" />
        <div className="h-4 w-full rounded bg-neutral-100" />
        <div className="h-4 w-full rounded bg-neutral-100" />
        <div className="h-4 w-1/2 rounded bg-neutral-100" />
      </div>
    </div>
  )
}

// --- Mobile Table/Item View (US-030-037) ------------------------------------

/** US-030/032 -- fetches the full ordered/filtered list once (same
 * useCollectionItems() hook desktop uses) and hands it to whichever mobile
 * view mode is active. Unlike desktop's ItemBrowser, there's no local
 * position state to remount here -- both mobile modes show every item at
 * once, so a changed query key alone is enough to refetch. */
/** US-011 -- both mobile views render every item at once (no single "active
 * card" to swap like desktop's ItemBrowser), so a Related tag jump within
 * the same page is handled by scrolling the target's row/card into view
 * instead of changing a position index. */
function mobileItemDomId(id: number): string {
  return `mobile-item-${id}`
}

function MobileCollectionView({
  collectionId,
  isWishlist,
  viewMode,
  initialItemId,
  platformId,
  genreId,
  franchiseId,
  sort,
  hasActiveFilters,
  onResetFilters,
  onSelectItem,
}: {
  collectionId: number
  isWishlist: boolean
  viewMode: MobileViewMode
  initialItemId: number | null
  platformId: number | null
  genreId: number | null
  franchiseId: number | null
  sort: SortOrder
  hasActiveFilters: boolean
  onResetFilters: () => void
  onSelectItem: (id: number, itemNumber: number) => void
}) {
  const { data: itemsPage } = useCollectionItems(collectionId, {
    platformId,
    genreId,
    franchiseId,
    sort,
  })
  const items = itemsPage?.data ?? []
  const total = itemsPage?.total ?? 0

  // US-011 -- scrolls the Related-tag jump target into view once it's on
  // the page. Guarded by a ref (not state) so it only fires once per
  // distinct initialItemId, even though items/viewMode changing re-runs the
  // effect (e.g. a stale ?item= left in the URL after later filter tweaks).
  // Computed manually (not scrollIntoView's block: 'start' + scroll-margin)
  // because the sticky bar's height varies (it can wrap to 2 lines
  // depending on how many filters are active/available), so a fixed
  // scroll-margin guess isn't reliable -- this measures it live instead.
  const scrolledToRef = useRef<number | null>(null)
  useEffect(() => {
    if (initialItemId === null || items.length === 0) return
    if (scrolledToRef.current === initialItemId) return

    const el = document.getElementById(mobileItemDomId(initialItemId))
    if (el) {
      const barHeight = document.getElementById(STICKY_BAR_ID)?.getBoundingClientRect().height ?? 0
      const top = el.getBoundingClientRect().top + window.scrollY - barHeight - 12

      window.scrollTo({ top, behavior: 'smooth' })
      scrolledToRef.current = initialItemId
    }
    // items.length, not items -- only the transition from "not yet
    // rendered" to "rendered" matters here, and depending on the array
    // itself would re-run this every render (a fresh ?? [] each time).
  }, [initialItemId, items.length, viewMode])

  if (itemsPage && total === 0) {
    return <EmptyState hasActiveFilters={hasActiveFilters} onResetFilters={onResetFilters} />
  }

  if (!itemsPage) {
    return <p className="text-sm text-neutral-500">Loading...</p>
  }

  return (
    <div className="w-full">
      <p className="pb-2 text-sm text-neutral-500">{total} item(s)</p>
      {viewMode === 'table' ? (
        <MobileTableView
          items={items}
          isWishlist={isWishlist}
          sort={sort}
          onSelectItem={onSelectItem}
        />
      ) : (
        <MobileItemView items={items} isWishlist={isWishlist} />
      )}
    </div>
  )
}

/** US-032 -- Item Number + Title always shown, plus two columns that depend
 * on collection type and active sort. Price/Most-wanted sort modes aren't
 * wired up yet (see docs/tz/TECH_DEBT.md), so any sort besides A-Z/Z-A
 * falls back to the "Newest/Oldest added" column pair for a Wishlist. */
function mobileTableColumns(
  isWishlist: boolean,
  sort: SortOrder,
  formatPrice: (eurAmount: string | number | null) => string | null,
): {
  thirdLabel: string
  fourthLabel: string
  thirdValue: (item: ItemSummary) => string
  fourthValue: (item: ItemSummary) => string
} {
  const platformValue = (item: ItemSummary) =>
    item.platform?.abbreviation ?? item.platform?.name ?? '—'
  const desireValue = (item: ItemSummary) =>
    item.wishlist_detail?.desire_score != null ? `${item.wishlist_detail.desire_score}%` : '—'
  const priceValue = (item: ItemSummary) => {
    const detail = item.wishlist_detail
    const parts = [
      detail?.price_new_estimate && `new ${formatPrice(detail.price_new_estimate)}`,
      detail?.price_used_estimate && `used ${formatPrice(detail.price_used_estimate)}`,
    ].filter(Boolean)

    return parts.length > 0 ? parts.join(' / ') : '—'
  }

  if (!isWishlist) {
    return {
      thirdLabel: 'Platform',
      fourthLabel: 'Genre',
      thirdValue: platformValue,
      fourthValue: (item) => item.genres.map((g) => g.name).join(', ') || '—',
    }
  }

  if (sort === 'az' || sort === 'za') {
    return {
      thirdLabel: 'Desire',
      fourthLabel: 'Price',
      thirdValue: desireValue,
      fourthValue: priceValue,
    }
  }

  return {
    thirdLabel: 'Platform',
    fourthLabel: 'Desire',
    thirdValue: platformValue,
    fourthValue: desireValue,
  }
}

function MobileTableView({
  items,
  isWishlist,
  sort,
  onSelectItem,
}: {
  items: ItemSummary[]
  isWishlist: boolean
  sort: SortOrder
  onSelectItem: (id: number, itemNumber: number) => void
}) {
  const { formatPrice } = useCurrency()
  const columns = mobileTableColumns(isWishlist, sort, formatPrice)

  return (
    <table className="w-full border-collapse text-left text-sm">
      <thead>
        <tr className="border-b border-neutral-200 text-xs text-neutral-500">
          <th className="w-8 px-2 py-2 font-medium">#</th>
          <th className="px-2 py-2 font-medium">Title</th>
          <th className="px-2 py-2 font-medium">{columns.thirdLabel}</th>
          <th className="px-2 py-2 font-medium">{columns.fourthLabel}</th>
        </tr>
      </thead>
      <tbody>
        {items.map((item, i) => (
          <tr
            key={item.id}
            id={mobileItemDomId(item.id)}
            onClick={() => onSelectItem(item.id, i + 1)}
            className="cursor-pointer border-b border-neutral-100 last:border-0 hover:bg-neutral-50"
          >
            <td className="px-2 py-2 align-middle text-neutral-400">{i + 1}</td>
            {/* US-033 -- cover as a background, 30% opacity fading to 5%
                left-to-right. A white gradient layered over the image
                (rather than true image opacity) so it fades to the row's
                own background instead of always fading to white. */}
            <td
              className="relative px-2 py-2 align-middle font-medium text-neutral-900"
              style={
                item.cover_url
                  ? {
                      backgroundImage: `linear-gradient(to right, rgba(255,255,255,0.7), rgba(255,255,255,0.95)), url(${item.cover_url})`,
                      backgroundSize: 'cover',
                      backgroundPosition: 'center',
                    }
                  : undefined
              }
            >
              {item.title}
            </td>
            <td className="px-2 py-2 align-middle text-neutral-600">{columns.thirdValue(item)}</td>
            <td className="px-2 py-2 align-middle text-neutral-600">{columns.fourthValue(item)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

function MobileItemView({ items, isWishlist }: { items: ItemSummary[]; isWishlist: boolean }) {
  return (
    <div className="flex flex-col gap-4">
      {items.map((item, i) => (
        <div key={item.id} id={mobileItemDomId(item.id)}>
          <MobileItemCard itemId={item.id} itemNumber={i + 1} isWishlist={isWishlist} />
        </div>
      ))}
    </div>
  )
}

/** US-036 -- full item detail, one per stacked card, in the spec's exact
 * field order (image+overlay, item number, title, wishlist fields,
 * platform, genres, description, franchise, available-on, related tags,
 * year). Each card fetches its own detail via useItem() -- the same hook
 * desktop uses for its single active card -- rather than the lighter
 * ItemSummary from the list endpoint. Fine at "dozens to low hundreds" of
 * items (see ItemController::index()'s docblock); not lazy/virtualized --
 * see docs/tz/TECH_DEBT.md if collections grow much larger than that. */
function MobileItemCard({
  itemId,
  itemNumber,
  isWishlist,
}: {
  itemId: number
  itemNumber: number
  isWishlist: boolean
}) {
  const { data: item } = useItem(itemId)

  if (!item) {
    return <ItemCardSkeleton />
  }

  const meta = item.metadata
  const wishlist = item.wishlist_detail
  const showPriorityBadge = isWishlist && wishlist?.priority
  const showAcquisitionBadge = !isWishlist && wishlist?.received

  return (
    <div className="relative flex flex-col gap-3 rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm">
      <AdminEditLink itemId={item.id} />

      <div className="relative aspect-[3/4] w-full overflow-hidden rounded-xl bg-neutral-100">
        {item.cover_url ? (
          <img src={item.cover_url} alt={item.title} className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-sm text-neutral-400">
            No cover
          </div>
        )}
        {showPriorityBadge && wishlist && (
          <PriorityBadge
            priority={wishlist.priority as Priority}
            desireScore={wishlist.desire_score ?? 0}
          />
        )}
        {showAcquisitionBadge && wishlist && <AcquisitionBadge detail={wishlist} />}
      </div>

      <p className="text-xs text-neutral-400">Item {itemNumber}</p>
      <h2 className="text-xl font-semibold text-neutral-900">{item.title}</h2>

      {isWishlist && wishlist && <WishlistFields detail={wishlist} />}

      {item.platform && <p className="text-sm text-neutral-500">{item.platform.name}</p>}

      {item.genres.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {item.genres.map((genre) => (
            <span
              key={genre.id}
              className="rounded-full bg-neutral-100 px-2.5 py-0.5 text-xs text-neutral-600"
            >
              {genre.name}
            </span>
          ))}
        </div>
      )}

      {meta?.description && (
        <p className="text-sm leading-relaxed text-neutral-600">{meta.description}</p>
      )}

      {meta?.franchise && (
        <p className="text-sm text-neutral-500">
          Franchise: <span className="text-neutral-700">{meta.franchise.name}</span>
        </p>
      )}

      {meta && meta.other_platforms.length > 0 && (
        <TagRow label="Available on" tags={meta.other_platforms} />
      )}

      {meta && (meta.sequels.length > 0 || meta.prequels.length > 0 || meta.remakes.length > 0) && (
        <RelatedTagRow prequels={meta.prequels} sequels={meta.sequels} remakes={meta.remakes} />
      )}

      {meta?.release_year && <p className="text-sm text-neutral-500">{meta.release_year}</p>}
    </div>
  )
}

/** US-035 -- tapping a Table View row opens this, same fields/order as
 * Item View (literally reuses MobileItemCard). */
function ItemDetailPopup({
  itemId,
  itemNumber,
  isWishlist,
  onClose,
}: {
  itemId: number
  itemNumber: number
  isWishlist: boolean
  onClose: () => void
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 p-4"
      onClick={onClose}
    >
      <div className="mt-8 w-full max-w-md" onClick={(e) => e.stopPropagation()}>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="mb-2 ml-auto flex h-8 w-8 items-center justify-center rounded-full bg-white text-neutral-600 shadow-md"
        >
          ✕
        </button>
        <MobileItemCard itemId={itemId} itemNumber={itemNumber} isWishlist={isWishlist} />
      </div>
    </div>
  )
}

/** US-037 -- floating scroll-to-top button, bottom-left, appears once the
 * page has been scrolled. window.scrollY is an external browser API (not
 * derived from props/render), so tracking it via an effect-driven listener
 * is the right tool here, not a lint-rule violation. */
function ScrollToTopButton() {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    function onScroll() {
      setVisible(window.scrollY > 400)
    }

    window.addEventListener('scroll', onScroll, { passive: true })

    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  if (!visible) return null

  return (
    <button
      type="button"
      onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
      aria-label="Scroll to top"
      className="fixed bottom-4 left-4 z-40 flex h-11 w-11 items-center justify-center rounded-full bg-neutral-900/90 text-white shadow-lg backdrop-blur"
    >
      <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5">
        <path
          d="M12 19V5M5 12l7-7 7 7"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </button>
  )
}
