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

/** US-005 -- fetches the full ordered id list for a collection in one call
 * (per_page overridden well above Laravel's default 50), so the position
 * indicator and prev/next navigation don't need a second endpoint. Personal
 * collections are realistically dozens to low hundreds of items -- see
 * ItemController::index(). */
export function useCollectionItems(collectionId: number | null) {
  return useQuery({
    queryKey: ['items', 'collection', collectionId],
    queryFn: async () => {
      const { data } = await apiClient.get<PaginatedResponse<ItemSummary>>('/items', {
        params: { collection_id: collectionId, per_page: 200 },
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
