import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiClient } from './client'

export type ScrapeStatus = 'pending' | 'scraping' | 'scraped' | 'failed' | 'manual'

export interface Item {
  id: number
  collection_id: number
  type: string
  igdb_id: number | null
  title: string
  platform_id: number | null
  scrape_status: ScrapeStatus
}

interface CreateItemPayload {
  collection_id: number
  type: 'game'
  igdb_id: number
  title: string
  platform_id: number | null
}

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

export interface ItemSummary {
  id: number
  title: string
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

/** Shape of the sequels/prequels/remakes/other_platforms arrays stored in
 * item_metadata -- raw IGDB references (IGDB ids, not local ones). US-011's
 * in-collection/in-wishlist cross-referencing for these tags is deferred;
 * for now they render as plain (non-clickable) tags. */
export interface IgdbRef {
  id: number
  name: string
  abbreviation?: string
}

export interface ItemMetadataDetail {
  description: string | null
  release_year: string | null
  franchise: FranchiseRef | null
  developer: string | null
  publisher: string | null
  other_platforms: IgdbRef[]
  sequels: IgdbRef[]
  prequels: IgdbRef[]
  remakes: IgdbRef[]
}

/** US-021/022 -- only present when the item has a gifter row set for it. */
export interface GifterRef {
  id: number
  name: string
  avatar_path: string | null
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

export interface ItemDetail {
  id: number
  title: string
  subtitle: string | null
  type: string
  cover_url: string | null
  scrape_status: ScrapeStatus
  platform: PlatformRef | null
  genres: GenreRef[]
  metadata: ItemMetadataDetail | null
  wishlist_detail: WishlistDetailRef | null
}

/** US-010 -- full detail for the currently displayed card. */
export function useItem(itemId: number | null) {
  return useQuery({
    queryKey: ['items', itemId, 'detail'],
    queryFn: async () => {
      const { data } = await apiClient.get<ItemDetail>(`/items/${itemId}`)

      return data
    },
    enabled: itemId !== null,
    staleTime: 60 * 1000,
  })
}
