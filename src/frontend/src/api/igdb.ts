import { useQuery } from '@tanstack/react-query'
import { apiClient } from './client'

export interface IgdbPlatform {
  id: number
  name: string
  abbreviation: string | null
}

export interface IgdbSearchResult {
  igdb_id: number
  name: string | null
  year: number | null
  cover_url: string | null
  platforms: IgdbPlatform[]
}

/** US-110 step 2/3 -- debounced search, see useDebouncedValue in the page. */
export function useIgdbSearch(query: string) {
  return useQuery({
    queryKey: ['igdb-search', query],
    queryFn: async () => {
      const { data } = await apiClient.get<IgdbSearchResult[]>('/search/igdb', {
        params: { q: query },
      })

      return data
    },
    enabled: query.trim().length > 0,
    staleTime: 60 * 1000,
    // Search results are ephemeral picks, not worth keeping around once the
    // admin moves on -- avoid unbounded cache growth from many queries typed.
    gcTime: 60 * 1000,
  })
}
