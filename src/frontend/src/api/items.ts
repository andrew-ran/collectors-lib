import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiClient } from './client'

export type ScrapeStatus = 'pending' | 'scraping' | 'scraped' | 'failed' | 'manual'

/** Shared across AdminAddItemPage/AdminEditItemPage/AdminItemsPage --
 * previously duplicated per-file. */
export const SCRAPE_STATUS_LABEL: Record<ScrapeStatus, string> = {
  pending: 'Scraping...',
  scraping: 'Scraping...',
  scraped: 'Ready',
  failed: 'Failed',
  manual: 'Ready',
}

export interface Item {
  id: number
  collection_id: number
  type: string
  igdb_id: number | null
  title: string
  platform_id: number | null
  scrape_status: ScrapeStatus
}

/** US-110's game-add flow only ever sends the `game`/`igdb_id` shape;
 * US-121's book-add flow (AdminAddBookPage.tsx) sends the `book` shape
 * instead -- `igdb_id` swapped for `custom_identifier` (the ISBN) plus
 * whatever metadata was looked up (or typed) client-side, since there's no
 * server-side scrape job for books to fill it in afterwards (see
 * ItemController::store()'s docblock). Both shapes share the same endpoint;
 * the discriminated `type` field is what the backend actually branches on. */
interface CreateGamePayload {
  collection_id: number
  type: 'game'
  igdb_id: number
  title: string
  platform_id: number | null
}

interface CreateBookPayload {
  collection_id: number
  type: 'book'
  custom_identifier: string | null
  title: string
  author: string | null
  publisher: string | null
  release_year: number | null
  cover_image_url: string | null
}

/** US-122 -- a console/peripheral add (AdminAddManualItemPage.tsx) is the
 * simplest shape of all: no external metadata source at all (IGDB's
 * peripheral support is too limited to be worth scraping, per
 * REQUIREMENTS.md), just the same bare fields a game/book add already needs
 * regardless of type. */
interface CreateManualItemPayload {
  collection_id: number
  type: 'console' | 'peripheral'
  title: string
  platform_id: number | null
}

type CreateItemPayload = CreateGamePayload | CreateBookPayload | CreateManualItemPayload

/** US-110 step 5 -- confirming a search result creates the item. */
export function useCreateItem() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (payload: CreateItemPayload) => {
      const { data } = await apiClient.post<Item>('/items', payload)

      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['items'] })
    },
  })
}

/** US-111 -- poll while the background scrape is still running, so the
 * "Scraping..." → "Ready" transition shows up without a manual refresh. */
export function useItemStatus(itemId: number | null) {
  return useQuery({
    queryKey: ['items', itemId, 'status'],
    queryFn: async () => {
      const { data } = await apiClient.get<Item>(`/items/${itemId}`)

      return data
    },
    enabled: itemId !== null,
    refetchInterval: (query) => {
      const status = query.state.data?.scrape_status

      return status === 'pending' || status === 'scraping' ? 1500 : false
    },
  })
}

// --- Public Item View (US-001, 002, 003, 005, 010) -------------------------

interface PaginatedResponse<T> {
  data: T[]
  total: number
  per_page: number
  current_page: number
  last_page: number
}

/** US-032/033 -- compact wishlist fields needed for the mobile Table View's
 * sort-dependent columns; a subset of WishlistDetailRef (no gifter -- that
 * relation isn't eager-loaded for the list endpoint, only single-item
 * detail). */
export interface WishlistSummaryRef {
  priority: Priority | null
  desire_score: number | null
  price_new_estimate: string | null
  price_used_estimate: string | null
}

/** US-032/033 -- extended beyond the original {id, title} to cover the
 * mobile Table View's columns (platform/genre, cover for the title column's
 * background gradient, wishlist desire/price) in the same request as the
 * ordered id list, instead of a per-row detail fetch. */
export interface ItemSummary {
  id: number
  title: string
  cover_url: string | null
  platform: PlatformRef | null
  genres: GenreRef[]
  wishlist_detail: WishlistSummaryRef | null
  // Present in ItemController::index()'s response all along (it eager-loads
  // `collection` and `scrape_status` is a plain column) -- added to the
  // type for AdminItemsPage's collection/status columns, same "type was
  // incomplete, not the API" situation as ItemDetail's admin fields.
  collection: { id: number; name: string; slug: string } | null
  scrape_status: ScrapeStatus
}

/** US-009 -- "My Collection" set; Wishlist's desire-score/price options
 * aren't implemented yet (need US-020/021's wishlist fields first). */
export type SortOrder = 'newest' | 'oldest' | 'az' | 'za'

export interface ItemFilters {
  platformId?: number | null
  genreId?: number | null
  franchiseId?: number | null
  sort?: SortOrder
}

/** US-005/006/009 -- fetches the full ordered id list for a collection in
 * one call (per_page overridden well above Laravel's default 50), so the
 * position indicator and prev/next navigation don't need a second endpoint.
 * Personal collections are realistically dozens to low hundreds of items --
 * see ItemController::index(). */
export function useCollectionItems(collectionId: number | null, filters: ItemFilters = {}) {
  const { platformId, genreId, franchiseId, sort } = filters

  return useQuery({
    queryKey: ['items', 'collection', collectionId, platformId, genreId, franchiseId, sort],
    queryFn: async () => {
      const { data } = await apiClient.get<PaginatedResponse<ItemSummary>>('/items', {
        params: {
          collection_id: collectionId,
          per_page: 200,
          platform_id: platformId ?? undefined,
          genre_id: genreId ?? undefined,
          franchise_id: franchiseId ?? undefined,
          sort,
        },
      })

      return data
    },
    enabled: collectionId !== null,
    staleTime: 60 * 1000,
  })
}

/** Admin item list (US-112 follow-up, AdminItemsPage) -- unlike
 * useCollectionItems(), `collectionId` is optional/nullable here on
 * purpose: omitting it means "every collection", which
 * ItemController::index() already supports (collection_id was always an
 * optional filter, just never exercised from the frontend without one). */
export interface AdminItemListFilters {
  collectionId?: number | null
  q?: string
}

export function useAdminItemList(filters: AdminItemListFilters) {
  const { collectionId, q } = filters

  return useQuery({
    queryKey: ['items', 'admin-list', collectionId, q],
    queryFn: async () => {
      const { data } = await apiClient.get<PaginatedResponse<ItemSummary>>('/items', {
        params: {
          collection_id: collectionId || undefined,
          q: q || undefined,
          per_page: 200,
        },
      })

      return data
    },
    staleTime: 30 * 1000,
  })
}

export interface FilterOptions {
  platforms: PlatformRef[]
  genres: GenreRef[]
  franchises: FranchiseRef[]
}

/** US-006a -- only values actually present among the current collection's
 * items; an empty array for a dimension is what drives that filter's
 * disabled state. */
export function useFilterOptions(collectionId: number | null) {
  return useQuery({
    queryKey: ['items', 'filter-options', collectionId],
    queryFn: async () => {
      const { data } = await apiClient.get<FilterOptions>('/items/filter-options', {
        params: { collection_id: collectionId },
      })

      return data
    },
    enabled: collectionId !== null,
    staleTime: 60 * 1000,
  })
}

export interface PlatformRef {
  id: number
  name: string
  abbreviation: string | null
}

export interface GenreRef {
  id: number
  name: string
}

export interface FranchiseRef {
  id: number
  name: string
}

/** Shape of the other_platforms array stored in item_metadata -- raw IGDB
 * references (IGDB ids, not local ones), rendered as plain non-clickable
 * tags (US-010). */
export interface IgdbRef {
  id: number
  name: string
  abbreviation?: string
}

/** US-011 -- sequels/prequels/remakes are the same raw IGDB reference, plus
 * server-derived ownership status so the tag can show the right tooltip/
 * checkmark and jump straight to the local item on click. `sequels`/
 * `prequels` are themselves an approximation (same-franchise games split by
 * release date, not a real IGDB sequel/prequel relation) -- see
 * docs/tz/TECH_DEBT.md and the CHANGELOG. */
export interface RelatedGameRef extends IgdbRef {
  status: 'unowned' | 'wishlisted' | 'owned'
  item_id: number | null
  collection_slug: string | null
}

export interface ItemMetadataDetail {
  description: string | null
  release_year: string | null
  franchise: FranchiseRef | null
  developer: string | null
  publisher: string | null
  other_platforms: IgdbRef[]
  sequels: RelatedGameRef[]
  prequels: RelatedGameRef[]
  remakes: RelatedGameRef[]
  /** Captured from IGDB but not surfaced in the UI yet -- see US-011 tech
   * debt note, may be shown alongside remakes in a future pass. */
  remasters: IgdbRef[]
  /** US-112 -- which fields the admin has manually edited, keyed by the
   * same names ItemController::applyMetadataInput() uses ('description',
   * 'franchise_id', 'developer', 'publisher', 'genres') plus 'title' (an
   * `items` column, tracked in this same blob regardless). Drives the edit
   * form's "manually edited" indicator and is otherwise only read by
   * ScrapeItemMetadataJob server-side. */
  manual_overrides: Record<string, boolean>
}

/** US-021/022 -- only present when the item has a gifter row set for it.
 * `avatar_path` is a raw relative disk path (not directly usable as an <img
 * src>) -- `avatar_url` is the resolved URL and is what the UI must render;
 * see AcquisitionBadge, and the same avatar_path/avatar_url distinction on
 * Gifter (api/gifters.ts). */
export interface GifterRef {
  id: number
  name: string
  avatar_path: string | null
  avatar_url: string | null
}

export type ConditionPreference = 'new_only' | 'used_ok' | 'cartridge_only'
export type AcquisitionType = 'gifted' | 'self_purchased'
export type Priority = 'low' | 'medium' | 'high'

/** US-020/021/023 -- present whenever the item was added through (or still
 * lives in) the Wishlist. `priority` is server-derived from `desire_score`
 * (see WishlistDetail::priority()). Money fields come back as decimal
 * strings from Laravel; currency display/conversion is US-170/171, not
 * done yet -- rendered as plain numbers for now. */
export interface WishlistDetailRef {
  condition_preference: ConditionPreference | null
  edition_note: string | null
  price_new_estimate: string | null
  price_used_estimate: string | null
  desire_score: number | null
  priority: Priority | null
  received: boolean
  acquisition_type: AcquisitionType | null
  price_paid: string | null
  gifter: GifterRef | null
  gifter_name_override: string | null
  thank_you_note: string | null
}

export type AcquiredDatePrecision = 'day' | 'month' | 'year'

/** US-117/118/119/120 -- an admin-uploaded photo. `photo_url` is the only
 * field the frontend renders from directly; `file_path` is included because
 * it's simply what the API serializes (ItemPhoto::$appends), not because
 * anything here uses it. */
export interface ItemPhotoRef {
  id: number
  file_path: string
  photo_url: string
  sort_order: number
  is_primary: boolean
}

export interface ItemDetail {
  id: number
  title: string
  subtitle: string | null
  type: string
  cover_url: string | null
  /** US-118 -- the cover on its own, ignoring any primary-photo override;
   * ItemPhotoManager's permanent "IGDB cover" base tile always shows this,
   * regardless of which uploaded photo (if any) `cover_url` currently
   * resolves to instead. */
  igdb_cover_url: string | null
  scrape_status: ScrapeStatus
  platform: PlatformRef | null
  genres: GenreRef[]
  metadata: ItemMetadataDetail | null
  wishlist_detail: WishlistDetailRef | null
  photos: ItemPhotoRef[]
  // US-112/114 -- raw columns the public Item View never reads, but the
  // admin edit form does. Already present in ItemController::show()'s
  // response today (it just serializes the whole Eloquent model) -- these
  // were only missing from the type, not the API.
  collection_id: number
  igdb_id: number | null
  custom_identifier: string | null
  platform_id: number | null
  acquired_date: string | null
  acquired_date_precision: AcquiredDatePrecision | null
  purchase_price: string | null
  notes: string | null
  /** Set by ScrapeItemMetadataJob on each successful scrape -- used purely
   * as a remount key by AdminEditItemPage (US-113) to reseed its form after
   * a re-scrape completes, not displayed anywhere. */
  scraped_at: string | null
}

/** US-010 -- full detail for the currently displayed card. Also polls while
 * a scrape is in flight (US-113's "Refresh metadata" re-triggers one), same
 * idea as useItemStatus -- so the edit form's "Scraping..." status clears
 * on its own once ScrapeItemMetadataJob finishes, without a manual refresh. */
export function useItem(itemId: number | null) {
  return useQuery({
    queryKey: ['items', itemId, 'detail'],
    queryFn: async () => {
      const { data } = await apiClient.get<ItemDetail>(`/items/${itemId}`)

      return data
    },
    enabled: itemId !== null,
    staleTime: 60 * 1000,
    refetchInterval: (query) => {
      const status = query.state.data?.scrape_status

      return status === 'pending' || status === 'scraping' ? 1500 : false
    },
  })
}

/** US-112 -- edit form payload. `description`/`franchise_name`/`developer`/
 * `publisher`/`genres` are optional on the wire (see
 * ItemController::validated()'s 'sometimes' rules) but the edit form always
 * sends all of them together -- see useUpdateItem's docblock. */
export interface UpdateItemPayload {
  collection_id: number
  type: string
  igdb_id: number | null
  custom_identifier: string | null
  title: string
  subtitle: string | null
  platform_id: number | null
  acquired_date: string | null
  acquired_date_precision: AcquiredDatePrecision | null
  purchase_price: string | null
  notes: string | null
  description: string | null
  franchise_name: string | null
  developer: string | null
  publisher: string | null
  genres: string[]
}

/** US-112/114 -- always sends the full payload (never a partial patch) --
 * ItemController::update() only knows "field present in the request" for
 * the metadata fields, so omitting one there would be indistinguishable
 * from "admin cleared it" rather than "admin didn't touch it". */
export function useUpdateItem(itemId: number) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (payload: UpdateItemPayload) => {
      const { data } = await apiClient.put<ItemDetail>(`/items/${itemId}`, payload)

      return data
    },
    onSuccess: (data) => {
      queryClient.setQueryData(['items', itemId, 'detail'], data)
      queryClient.invalidateQueries({ queryKey: ['items'] })
    },
  })
}

/** US-113 -- re-fetch from IGDB. Manually-edited fields are left alone
 * server-side (ScrapeItemMetadataJob checks manual_overrides); this just
 * flips scrape_status back to pending and dispatches the job, then relies
 * on useItem's polling (above) to pick up "Ready" once it's done. */
export function useRescrapeItem(itemId: number) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async () => {
      const { data } = await apiClient.post<ItemDetail>(`/items/${itemId}/rescrape`)

      return data
    },
    onSuccess: (data) => {
      queryClient.setQueryData(['items', itemId, 'detail'], data)
    },
  })
}

/** US-115 -- admin delete, from the edit form. */
export function useDeleteItem() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (itemId: number) => {
      await apiClient.delete(`/items/${itemId}`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['items'] })
    },
  })
}
