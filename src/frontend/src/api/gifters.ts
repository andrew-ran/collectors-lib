import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiClient } from './client'

export interface Gifter {
  id: number
  name: string
  avatar_path: string | null
  avatar_url: string | null
}

/** US-160/161 -- admin-only gifter list, backing GiftersAdmin.tsx. Also the
 * gifter picker in WishlistAdminPanel's "mark as gifted" flow (US-162/163). */
export function useGifters() {
  return useQuery({
    queryKey: ['gifters'],
    queryFn: async () => {
      const { data } = await apiClient.get<Gifter[]>('/gifters')

      return data
    },
    staleTime: 5 * 60 * 1000,
  })
}

/** US-160 -- name + optional avatar photo, re-encoded to WebP server-side
 * (GifterController::storeAvatar()). FormData is required here (not JSON)
 * because of the file. */
export function useCreateGifter() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ name, avatar }: { name: string; avatar: File | null }) => {
      const formData = new FormData()
      formData.append('name', name)
      if (avatar) formData.append('avatar', avatar)

      const { data } = await apiClient.post<Gifter>('/gifters', formData)

      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gifters'] })
    },
  })
}

/** US-161 -- rename and/or replace the avatar. Sent as a POST with Laravel's
 * `_method=PUT` spoofing field rather than a real PUT/PATCH, since PHP
 * doesn't populate $_FILES for multipart bodies on anything but POST. */
export function useUpdateGifter(gifterId: number) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ name, avatar }: { name: string; avatar: File | null }) => {
      const formData = new FormData()
      formData.append('_method', 'PUT')
      formData.append('name', name)
      if (avatar) formData.append('avatar', avatar)

      const { data } = await apiClient.post<Gifter>(`/gifters/${gifterId}`, formData)

      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gifters'] })
    },
  })
}

/** US-161 -- delete. Safe even if the gifter is referenced by past
 * acquisitions: `wishlist_details.gifter_id` is `nullOnDelete()`, so those
 * rows just lose the link rather than being deleted themselves. */
export function useDeleteGifter() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (gifterId: number) => {
      await apiClient.delete(`/gifters/${gifterId}`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gifters'] })
    },
  })
}
