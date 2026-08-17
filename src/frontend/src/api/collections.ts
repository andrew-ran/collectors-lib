import { useQuery } from '@tanstack/react-query'
import { apiClient } from './client'

export interface Collection {
  id: number
  slug: string
  name: string
  description: string | null
  is_default: boolean
  is_wishlist: boolean
  sort_order: number
}

/** US-110 step 1 -- destination collection picker. */
export function useCollections() {
  return useQuery({
    queryKey: ['collections'],
    queryFn: async () => {
      const { data } = await apiClient.get<Collection[]>('/collections')

      return data
    },
    staleTime: 5 * 60 * 1000,
  })
}
