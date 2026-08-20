import { useCallback, useEffect, useState, type ReactNode } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useCollections, type Collection } from '../api/collections'
import {
  useCollectionItems,
  useFilterOptions,
  useItem,
  type FilterOptions,
  type IgdbRef,
  type ItemDetail,
  type SortOrder,
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
 * Deliberately scoped down for this pass -- explicitly NOT included yet
 * (see docs/tz/BACKLOG.md Phase 2):
 * - US-011 sequel/prequel/remake tag interactivity (in-collection/wishlist
 *   cross-referencing) -- tags render as plain, non-clickable labels
 * - US-012 photo slider/lightbox -- no admin-uploaded photos exist yet,
 *   just the single primary cover image
 * - US-020/021 wishlist fields and the Gifted/Purchased badge, and the
 *   Wishlist-specific desire-score/price sort options that depend on them
 */
export function CollectionItemViewPage() {
  const [searchParams, setSearchParams] = useSearchParams()

  const collectionSlug = searchParams.get('collection')
  const platformId = toIntOrNull(searchParams.get('platform'))
  const genreId = toIntOrNull(searchParams.get('genre'))
  const franchiseId = toIntOrNull(searchParams.get('franchise'))
  const sort = (searchParams.get('sort') as SortOrder | null) ?? 'newest'

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
    updateParams({ collection: c.slug, platform: null, genre: null, franchise: null })
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
        key={`${collection.id}-${platformId ?? ''}-${genreId ?? ''}-${franchiseId ?? ''}-${sort}`}
        collectionId={collection.id}
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
  platformId,
  genreId,
  franchiseId,
  sort,
  hasActiveFilters,
  onResetFilters,
}: {
  collectionId: number
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
  const clampedIndex = Math.min(index, Math.max(items.length - 1, 0))
  const currentId = items[clampedIndex]?.id ?? null

  const { data: item } = useItem(currentId)

  const goPrev = useCallback(() => setIndex((i) => Math.max(i - 1, 0)), [])
  const goNext = useCallback(
    () => setIndex((i) => Math.min(i + 1, items.length - 1)),
    [items.length],
  )

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

        {item ? <ItemCard item={item} /> : <ItemCardSkeleton />}

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

function ItemCard({ item }: { item: ItemDetail }) {
  const meta = item.metadata

  return (
    <div className="flex w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-sm sm:flex-row">
      <div className="aspect-[3/4] w-full shrink-0 bg-neutral-100 sm:w-64">
        {item.cover_url ? (
          <img src={item.cover_url} alt={item.title} className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-sm text-neutral-400">
            No cover
          </div>
        )}
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
          <TagRow
            label="Related"
            tags={[...meta.prequels, ...meta.sequels, ...meta.remakes]}
          />
        )}
      </div>
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
