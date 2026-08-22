import { useMutation } from '@tanstack/react-query'
import { apiClient } from './client'

export interface OpenLibraryBook {
  isbn: string
  title: string | null
  author: string | null
  publisher: string | null
  year: number | null
  cover_url: string | null
}

/** US-121 -- ISBN lookup for the admin "add book" flow. A mutation (an
 * on-demand "Lookup" button click), not a query like useIgdbSearch's
 * debounced-as-you-type search -- an ISBN is exact, so there's exactly one
 * match or none (a 404), not a list of fuzzy candidates to narrow down. */
export function useOpenLibraryLookup() {
  return useMutation({
    mutationFn: async (isbn: string) => {
      const { data } = await apiClient.get<OpenLibraryBook>('/search/open-library', {
        params: { isbn },
      })

      return data
    },
  })
}
