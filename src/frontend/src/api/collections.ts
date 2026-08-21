import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
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

/** US-110 step 1 -- destination collection picker. Also the admin
 * CollectionsAdmin list (US-130-133). */
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

export interface CollectionPayload {
  name: string
  description: string | null
  is_wishlist: boolean
}

/** US-130 -- new collections are never default and always sort after every
 * existing one; both handled server-side. */
export function useCreateCollection() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (payload: CollectionPayload) => {
      const { data } = await apiClient.post<Collection>('/collections', payload)

      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['collections'] })
    },
  })
}

/** US-131/133 -- name is rejected server-side if it would actually change
 * on a default collection; description/is_wishlist stay editable on
 * defaults too. */
export function useUpdateCollection(collectionId: number) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (payload: CollectionPayload) => {
      const { data } = await apiClient.put<Collection>(`/collections/${collectionId}`, payload)

      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['collections'] })
    },
  })
}

/** US-132 -- default collections are rejected server-side; the UI also
 * hides/disables Delete for them so this mostly only fires for non-default
 * collections in practice. */
export function useDeleteCollection() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (collectionId: number) => {
      await apiClient.delete(`/collections/${collectionId}`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['collections'] })
    },
  })
}
