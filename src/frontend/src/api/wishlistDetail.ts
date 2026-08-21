import { useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient } from './client'
import type { AcquisitionType, ConditionPreference, ItemDetail } from './items'

/** US-150 -- wishlist-only fields, saved independently of the main item
 * edit form (see WishlistDetailController::update()'s docblock for why). */
export interface WishlistDetailPayload {
  condition_preference: ConditionPreference | null
  edition_note: string | null
  price_new_estimate: string | null
  price_used_estimate: string | null
  desire_score: number | null
}

export function useUpdateWishlistDetail(itemId: number) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (payload: WishlistDetailPayload) => {
      const { data } = await apiClient.put<ItemDetail>(`/items/${itemId}/wishlist-detail`, payload)

      return data
    },
    onSuccess: (data) => {
      queryClient.setQueryData(['items', itemId, 'detail'], data)
    },
  })
}

/** US-151/162/163 -- mark a wishlist item received: acquisition type,
 * either a registered gifter or a one-off name (mutually exclusive -- the
 * form only ever sends one), thank-you note, price paid, received date, and
 * the destination collection. Invalidates the broader ['items'] list too
 * (not just this item's detail) since the item just moved out of whichever
 * collection list it was showing up in. */
export interface MarkReceivedPayload {
  acquisition_type: AcquisitionType
  gifter_id: number | null
  gifter_name_override: string | null
  thank_you_note: string | null
  price_paid: string | null
  received_at: string
  collection_id: number
}

export function useMarkItemReceived(itemId: number) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (payload: MarkReceivedPayload) => {
      const { data } = await apiClient.post<ItemDetail>(`/items/${itemId}/mark-received`, payload)

      return data
    },
    onSuccess: (data) => {
      queryClient.setQueryData(['items', itemId, 'detail'], data)
      queryClient.invalidateQueries({ queryKey: ['items'] })
    },
  })
}
