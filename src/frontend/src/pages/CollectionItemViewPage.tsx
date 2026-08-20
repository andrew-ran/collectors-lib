import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import { useCollections, type Collection } from '../api/collections'
import { useCollectionItems, useItem, type IgdbRef, type ItemDetail } from '../api/items'

/** US-001/001b/002/003/005/010 -- the public homepage: a collection's items
 * shown one at a time, horizontal layout, arrow-button + keyboard
 * navigation, position indicator, collection switcher.
 *
 * Deliberately scoped down for this first pass -- explicitly NOT included
 * yet (see docs/tz/BACKLOG.md Phase 2):
 * - US-006/007/008/009 filters, sort, URL state
 * - US-011 sequel/prequel/remake tag interactivity (in-collection/wishlist
 *   cross-referencing) -- tags render as plain, non-clickable labels
 * - US-012 photo slider/lightbox -- no admin-uploaded photos exist yet,
 *   just the single primary cover image
 * - US-020/021 wishlist fields and the Gifted/Purchased badge -- this view
 *   doesn't yet special-case the Wishlist collection's own fields
 */
export function CollectionItemViewPage() {
  const { data: collections, isLoading: collectionsLoading } = useCollections()
  const [collectionIdOverride, setCollectionIdOverride] = useState<number | null>(null)
  const collection =
    collections?.find((c) => c.id === collectionIdOverride) ??
    collections?.find((c) => c.is_default) ??
    collections?.[0] ??
    null

  const { data: itemsPage } = useCollectionItems(collection?.id ?? null)
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

  // US-007's "resets to item 1" is written for filters, but the same logic
  // applies to switching collections -- position 1 in the new collection,
  // not whatever index happened to be selected in the old one.
  function selectCollection(id: number) {
    setCollectionIdOverride(id)
    setIndex(0)
  }

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'ArrowLeft') goPrev()
      if (e.key === 'ArrowRight') goNext()
    }

    window.addEventListener('keydown', onKeyDown)

    return () => window.removeEventListener('keydown', onKeyDown)
  }, [goPrev, goNext])

  if (collectionsLoading) {
    return <CenteredMessage>Loading...</CenteredMessage>
  }

  if (!collection) {
    return <CenteredMessage>No collections yet.</CenteredMessage>
  }

  if (itemsPage && total === 0) {
    return (
      <div className="mx-auto flex min-h-screen max-w-2xl flex-col items-center justify-center gap-2 px-4 text-center">
        <CollectionSwitcher
          collections={collections ?? []}
          current={collection}
          onSelect={selectCollection}
        />
        <p className="text-neutral-500">No items yet.</p>
      </div>
    )
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-5xl flex-col items-center justify-center gap-6 px-4 py-10">
      <CollectionSwitcher
        collections={collections ?? []}
        current={collection}
        onSelect={selectCollection}
      />

      <div className="flex w-full items-center justify-center gap-3 sm:gap-6">
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
    </div>
  )
}

function CenteredMessage({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center text-neutral-500">
      {children}
    </div>
  )
}

/** US-001b -- button next to the collection name opens a dropdown of every
 * collection, same width as the name+button element, up to 4 rows visible
 * then scrollable (US-006a's height rule). */
function CollectionSwitcher({
  collections,
  current,
  onSelect,
}: {
  collections: Collection[]
  current: Collection
  onSelect: (id: number) => void
}) {
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return

    function onPointerDown(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false)
    }

    document.addEventListener('mousedown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)

    return () => {
      document.removeEventListener('mousedown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [open])

  return (
    <div ref={containerRef} className="relative inline-block">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="flex items-center gap-1.5 rounded-full border border-transparent px-2 py-1 text-xl font-semibold text-neutral-900 transition hover:border-neutral-200 hover:bg-neutral-50"
      >
        {current.name}
        <svg
          viewBox="0 0 24 24"
          fill="none"
          className={`h-4 w-4 text-neutral-400 transition-transform ${open ? 'rotate-180' : ''}`}
        >
          <path
            d="M6 9l6 6 6-6"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>

      {open && (
        <ul className="absolute top-full left-0 z-10 mt-1 max-h-40 w-full min-w-full overflow-y-auto rounded-lg border border-neutral-200 bg-white py-1 shadow-md">
          {collections.map((c) => (
            <li key={c.id}>
              <button
                type="button"
                onClick={() => {
                  onSelect(c.id)
                  setOpen(false)
                }}
                className={`block w-full px-3 py-2 text-left text-sm whitespace-nowrap hover:bg-neutral-50 ${
                  c.id === current.id ? 'font-medium text-neutral-900' : 'text-neutral-600'
                }`}
              >
                {c.name}
              </button>
            </li>
          ))}
        </ul>
      )}
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
