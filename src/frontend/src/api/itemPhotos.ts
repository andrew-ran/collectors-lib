import { useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient } from './client'
import type { ItemPhotoRef } from './items'

/** US-117/118/119/120 -- photo manager mutations backing ItemPhotoManager.tsx.
 * All four invalidate the item detail query rather than hand-patching the
 * cache: `item.cover_url` is a server-derived field (which photo, if any, is
 * primary) that lives alongside -- but separate from -- the `photos` array
 * itself, so a local patch to `photos` alone could leave a stale cover_url
 * behind after setting/deleting a primary photo. A refetch keeps both in
 * sync at the cost of one extra request per action -- acceptable for an
 * admin-only, one-item-at-a-time screen. */

export function useUploadItemPhotos(itemId: number) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (files: File[]) => {
      const formData = new FormData()
      files.forEach((file) => formData.append('photos[]', file))

      const { data } = await apiClient.post<ItemPhotoRef[]>(`/items/${itemId}/photos`, formData)

      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['items', itemId, 'detail'] })
    },
  })
}

/** US-118 -- drag-to-reorder; sends the full ordered id list every time,
 * matching ItemPhotoController::reorder()'s all-or-nothing validation. */
export function useReorderItemPhotos(itemId: number) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (photoIds: number[]) => {
      await apiClient.put(`/items/${itemId}/photos/reorder`, { photo_ids: photoIds })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['items', itemId, 'detail'] })
    },
  })
}

/** US-119 -- mark a photo primary (unsetting any other primary photo on this
 * item is handled server-side). */
export function useSetPrimaryItemPhoto(itemId: number) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (photoId: number) => {
      await apiClient.put(`/items/${itemId}/photos/${photoId}/primary`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['items', itemId, 'detail'] })
    },
  })
}

/** US-120 -- delete a photo. Reverting to the IGDB cover when the deleted
 * photo was primary needs no special client-side handling -- the refetch
 * this triggers picks up whatever cover_url the server now resolves to. */
export function useDeleteItemPhoto(itemId: number) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (photoId: number) => {
      await apiClient.delete(`/items/${itemId}/photos/${photoId}`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['items', itemId, 'detail'] })
    },
  })
}
