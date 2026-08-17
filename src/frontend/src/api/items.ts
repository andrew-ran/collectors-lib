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
