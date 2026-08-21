import { useQuery } from '@tanstack/react-query'
import { apiClient } from './client'

interface NamedRef {
  id: number
  name: string
}

interface PlatformOption extends NamedRef {
  abbreviation: string | null
}

/** US-112 -- edit-form autocomplete lists (see DictionaryController). Plain
 * full lists, filtered client-side via a <datalist> -- these dictionaries
 * are small ("dozens to low hundreds", same scale assumption as the rest of
 * this project) and change rarely enough that a 10-minute staleTime plus a
 * full re-fetch on invalidation is simpler than a server-side search
 * endpoint. Admin-only (auth:sanctum), so all four no-op until logged in.
 * Unlike ItemController::filterOptions() (US-006a), this isn't scoped to a
 * collection's existing items -- the edit form needs every platform. */
export function usePlatformOptions() {
  return useQuery({
    queryKey: ['dictionaries', 'platforms'],
    queryFn: async () => {
      const { data } = await apiClient.get<PlatformOption[]>('/platforms')

      return data
    },
    staleTime: 10 * 60 * 1000,
  })
}

export function useGenreOptions() {
  return useQuery({
    queryKey: ['dictionaries', 'genres'],
    queryFn: async () => {
      const { data } = await apiClient.get<NamedRef[]>('/genres')

      return data
    },
    staleTime: 10 * 60 * 1000,
  })
}

export function useFranchiseOptions() {
  return useQuery({
    queryKey: ['dictionaries', 'franchises'],
    queryFn: async () => {
      const { data } = await apiClient.get<NamedRef[]>('/franchises')

      return data
    },
    staleTime: 10 * 60 * 1000,
  })
}

/** Plain names, not {id, name} -- developer/publisher are free-text columns,
 * see ItemMetadataDetail's docblock. */
export function useCompanyOptions() {
  return useQuery({
    queryKey: ['dictionaries', 'companies'],
    queryFn: async () => {
      const { data } = await apiClient.get<string[]>('/companies')

      return data
    },
    staleTime: 10 * 60 * 1000,
  })
}
