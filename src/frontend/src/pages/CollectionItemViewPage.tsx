import { useCallback, useEffect, useState, type ReactNode } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useCollections, type Collection } from '../api/collections'
import {
  useCollectionItems,
  useFilterOptions,
  useItem,
  type ConditionPreference,
  type FilterOptions,
  type IgdbRef,
  type ItemDetail,
  type Priority,
  type RelatedGameRef,
  type SortOrder,
  type WishlistDetailRef,
} from '../api/items'
import { Dropdown, DropdownItem } from '../components/Dropdown'

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
 * Deliberately scoped down for this pass -- explicitly NOT included yet
 * (see docs/tz/BACKLOG.md Phase 2):
 * - US-012 photo slider/lightbox -- no admin-uploaded photos exist yet,
 *   just the single primary cover image
 * - US-170/171 currency selector/conversion -- wishlist prices render as
 *   plain numbers, no currency symbol or conversion yet
 * - Wishlist's Most/Least-wanted and Price sort options (US-009) -- the
 *   fields exist now, but the sort UI itself isn't wired up in this pass
 * - Real test data for the acquisition badge needs US-151 (mark received)
 *   to exist, or a manually seeded wishlist_details row + collection move
 */
export function CollectionItemViewPage() {
  const [searchParams, setSearchParams] = useSearchParams()

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
    <div className="mx-auto flex min-h-screen max-w-5xl flex-col items-center gap-6 px-4 py-10">
      <CollectionSwitcher
        collections={collections ?? []}
        current={collection}
        onSelect={selectCollection}
      />

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
      />

      {/* Remounts (resetting the browser's local position state) whenever
          collection/filters/sort change -- covers both clicks here and
          direct URL/back-button navigation, without an effect+setState. */}
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
    </div>
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

        <NavButton
          direction="next"
          onClick={goNext}
          disabled={clampedIndex >= items.length - 1}
        />
      </div>

      <p className="text-sm text-neutral-500">
        Item {total === 0 ? 0 : clampedIndex + 1} of {total}
      </p>
    </>
  )
}

function CenteredMessage({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center text-neutral-500">
      {children}
    </div>
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

function ItemCard({ item, isWishlist }: { item: ItemDetail; isWishlist: boolean }) {
  const meta = item.metadata
  const wishlist = item.wishlist_detail

  // US-020/021 -- mutually exclusive per the spec: an item either still
  // wants (Wishlist -> priority badge) or has already been acquired
  // (moved to a regular collection -> acquisition badge), never both.
  const showPriorityBadge = isWishlist && wishlist?.priority
  const showAcquisitionBadge = !isWishlist && wishlist?.received

  return (
    <div className="flex w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-sm sm:flex-row">
      <div className="relative aspect-[3/4] w-full shrink-0 bg-neutral-100 sm:w-64">
        {item.cover_url ? (
          <img src={item.cover_url} alt={item.title} className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-sm text-neutral-400">
            No cover
          </div>
        )}

        {showPriorityBadge && wishlist && (
          <PriorityBadge priority={wishlist.priority as Priority} desireScore={wishlist.desire_score ?? 0} />
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

        {meta && (meta.sequels.length > 0 || meta.prequels.length > 0 || meta.remakes.length > 0) && (
          <RelatedTagRow games={[...meta.prequels, ...meta.sequels, ...meta.remakes]} />
        )}

        {isWishlist && wishlist && <WishlistFields detail={wishlist} />}
      </div>
    </div>
  )
}

/** US-020 -- the Wishlist-only fields shown alongside the US-010 base info:
 * condition preference, a free-text edition note, and estimated price. */
function WishlistFields({ detail }: { detail: WishlistDetailRef }) {
  const hasPriceEstimate = detail.price_new_estimate !== null || detail.price_used_estimate !== null

  if (!detail.condition_preference && !detail.edition_note && !hasPriceEstimate) {
    return null
  }

  return (
    <div className="flex flex-col gap-1 border-t border-neutral-100 pt-3 text-sm text-neutral-600">
      {detail.condition_preference && (
        <p>
          Condition: <span className="text-neutral-800">{CONDITION_LABELS[detail.condition_preference]}</span>
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
              detail.price_new_estimate && `new ${detail.price_new_estimate}`,
              detail.price_used_estimate && `used ${detail.price_used_estimate}`,
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
    icon = gifter.avatar_path ? (
      <img src={gifter.avatar_path} alt="" className="h-full w-full rounded-full object-cover" />
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

function RelatedTagRow({ games }: { games: RelatedGameRef[] }) {
  return (
    <div className="text-sm">
      <span className="text-neutral-500">Related: </span>
      <span className="inline-flex flex-wrap gap-1.5 align-middle">
        {games.map((game, i) => (
          <RelatedTag key={`${game.status}-${game.id}-${i}`} game={game} />
        ))}
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

  const clickable = game.status !== 'unowned' && game.item_id !== null && game.collection_slug !== null
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
