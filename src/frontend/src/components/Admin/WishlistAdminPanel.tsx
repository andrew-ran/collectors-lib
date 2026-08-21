import { useState, type FormEvent } from 'react'
import { useCollections, type Collection } from '../../api/collections'
import { useGifters } from '../../api/gifters'
import { useMarkItemReceived, useUpdateWishlistDetail } from '../../api/wishlistDetail'
import type { AcquisitionType, ConditionPreference, ItemDetail } from '../../api/items'
import {
  ADMIN_BUTTON_PRIMARY,
  ADMIN_BUTTON_SECONDARY,
  ADMIN_CARD,
  ADMIN_INPUT,
  ADMIN_LABEL,
} from './adminUi'

const CONDITION_OPTIONS: { value: ConditionPreference; label: string }[] = [
  { value: 'new_only', label: 'New only' },
  { value: 'used_ok', label: 'Used is OK' },
  { value: 'cartridge_only', label: 'Cartridge only' },
]

function todayIsoDate(): string {
  return new Date().toISOString().slice(0, 10)
}

/**
 * US-150/151/162/163 -- shown on AdminEditItemPage only while the item's
 * *current* (saved) collection is wishlist-type -- see the `is_wishlist`
 * lookup in the caller. Two independent pieces, each with its own mutation
 * (same "instant admin action, not bundled into the main Save" pattern as
 * ItemPhotoManager/CollectionsAdmin/GiftersAdmin):
 *
 * 1. US-150 fields (condition/edition note/price estimates/desire score).
 *    Local state is seeded once from `item.wishlist_detail` at mount (the
 *    usual derived-state-on-mount pattern elsewhere in this admin) and never
 *    needs to resync afterward: a successful save's response is exactly
 *    what was just submitted, so this form's own state and the freshly
 *    cached item can't drift apart from each other. It would only go stale
 *    if something *other* than this form could change these fields
 *    server-side, which nothing does.
 * 2. US-151/162/163 "mark as received" -- a Gifted/Self-purchased toggle
 *    with progressive disclosure, a gifter picker OR a one-off name (never
 *    both), thank-you note, price paid, received date, and a destination
 *    collection. Confirming moves the item out of the wishlist entirely, at
 *    which point this whole panel disappears from its parent (the item's
 *    collection is no longer wishlist-type) -- no explicit navigation is
 *    needed here.
 */
export function WishlistAdminPanel({ item }: { item: ItemDetail }) {
  return (
    <div className={`space-y-6 ${ADMIN_CARD}`}>
      <h2 className="text-lg font-semibold text-neutral-900">Wishlist</h2>
      <WishlistFieldsForm item={item} />
      <div className="border-t border-neutral-200 pt-6">
        <MarkReceivedForm item={item} />
      </div>
    </div>
  )
}

function WishlistFieldsForm({ item }: { item: ItemDetail }) {
  const updateDetail = useUpdateWishlistDetail(item.id)
  const detail = item.wishlist_detail

  const [conditionPreference, setConditionPreference] = useState<ConditionPreference | ''>(
    detail?.condition_preference ?? '',
  )
  const [editionNote, setEditionNote] = useState(detail?.edition_note ?? '')
  const [priceNewEstimate, setPriceNewEstimate] = useState(detail?.price_new_estimate ?? '')
  const [priceUsedEstimate, setPriceUsedEstimate] = useState(detail?.price_used_estimate ?? '')
  const [desireScore, setDesireScore] = useState(detail?.desire_score ?? 50)

  function handleSubmit(event: FormEvent) {
    event.preventDefault()

    updateDetail.mutate({
      condition_preference: conditionPreference || null,
      edition_note: editionNote || null,
      price_new_estimate: priceNewEstimate || null,
      price_used_estimate: priceUsedEstimate || null,
      desire_score: desireScore,
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div className="flex gap-4">
        <div className="flex-1">
          <label className={ADMIN_LABEL}>Condition preference</label>
          <select
            value={conditionPreference}
            onChange={(e) => setConditionPreference(e.target.value as ConditionPreference | '')}
            className={ADMIN_INPUT}
          >
            <option value="">No preference</option>
            {CONDITION_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
        <div className="flex-1">
          <label className={ADMIN_LABEL}>Desire score ({desireScore}%)</label>
          <input
            type="range"
            min={0}
            max={100}
            value={desireScore}
            onChange={(e) => setDesireScore(Number(e.target.value))}
            className="mt-3 w-full"
          />
        </div>
      </div>

      <div>
        <label className={ADMIN_LABEL}>Edition note</label>
        <input
          type="text"
          value={editionNote}
          onChange={(e) => setEditionNote(e.target.value)}
          className={ADMIN_INPUT}
        />
      </div>

      <div className="flex gap-4">
        <div className="flex-1">
          <label className={ADMIN_LABEL}>Price estimate, new (EUR)</label>
          <input
            type="number"
            step="0.01"
            min="0"
            value={priceNewEstimate}
            onChange={(e) => setPriceNewEstimate(e.target.value)}
            className={ADMIN_INPUT}
          />
        </div>
        <div className="flex-1">
          <label className={ADMIN_LABEL}>Price estimate, used (EUR)</label>
          <input
            type="number"
            step="0.01"
            min="0"
            value={priceUsedEstimate}
            onChange={(e) => setPriceUsedEstimate(e.target.value)}
            className={ADMIN_INPUT}
          />
        </div>
      </div>

      <div className="flex items-center gap-3">
        <button type="submit" disabled={updateDetail.isPending} className={ADMIN_BUTTON_PRIMARY}>
          {updateDetail.isPending ? 'Saving...' : 'Save wishlist details'}
        </button>
        {updateDetail.isSuccess && <span className="text-sm text-green-700">Saved.</span>}
        {updateDetail.isError && <span className="text-sm text-red-600">Failed to save.</span>}
      </div>
    </form>
  )
}

function MarkReceivedForm({ item }: { item: ItemDetail }) {
  const { data: collections } = useCollections()
  const { data: gifters } = useGifters()
  const markReceived = useMarkItemReceived(item.id)

  const defaultCollection = collections?.find((c: Collection) => c.is_default && !c.is_wishlist)

  const [acquisitionType, setAcquisitionType] = useState<AcquisitionType>('gifted')
  const [gifterId, setGifterId] = useState('')
  const [useOneOffName, setUseOneOffName] = useState(false)
  const [gifterName, setGifterName] = useState('')
  const [thankYouNote, setThankYouNote] = useState('')
  const [pricePaid, setPricePaid] = useState('')
  const [receivedDate, setReceivedDate] = useState(todayIsoDate())
  const [collectionId, setCollectionId] = useState<number | ''>(defaultCollection?.id ?? '')

  const gifted = acquisitionType === 'gifted'

  function handleSubmit(event: FormEvent) {
    event.preventDefault()
    if (!collectionId) return

    markReceived.mutate({
      acquisition_type: acquisitionType,
      gifter_id: gifted && !useOneOffName && gifterId ? Number(gifterId) : null,
      gifter_name_override: gifted && useOneOffName ? gifterName || null : null,
      thank_you_note: gifted ? thankYouNote || null : null,
      price_paid: pricePaid || null,
      received_at: receivedDate,
      collection_id: collectionId,
    })
  }

  const targetName = collections?.find((c) => c.id === collectionId)?.name ?? '...'

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <h3 className="font-medium text-neutral-900">Mark as received</h3>

      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setAcquisitionType('gifted')}
          className={gifted ? ADMIN_BUTTON_PRIMARY : ADMIN_BUTTON_SECONDARY}
        >
          Gifted
        </button>
        <button
          type="button"
          onClick={() => setAcquisitionType('self_purchased')}
          className={!gifted ? ADMIN_BUTTON_PRIMARY : ADMIN_BUTTON_SECONDARY}
        >
          Self-purchased
        </button>
      </div>

      {gifted && (
        <div className="space-y-3 rounded-lg border border-neutral-200 bg-white p-3">
          <div className="flex items-center justify-between">
            <label className={ADMIN_LABEL}>
              {useOneOffName ? 'Gifter name (one-off)' : 'Gifter'}
            </label>
            <button
              type="button"
              onClick={() => setUseOneOffName((v) => !v)}
              className="text-xs text-neutral-500 underline hover:text-neutral-800"
            >
              {useOneOffName ? 'Pick from gifters list instead' : 'Type a one-off name instead'}
            </button>
          </div>

          {useOneOffName ? (
            <input
              type="text"
              value={gifterName}
              onChange={(e) => setGifterName(e.target.value)}
              placeholder="Leave blank for no name"
              maxLength={255}
              className={ADMIN_INPUT}
            />
          ) : (
            <select
              value={gifterId}
              onChange={(e) => setGifterId(e.target.value)}
              className={ADMIN_INPUT}
            >
              <option value="">No gifter set</option>
              {gifters?.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.name}
                </option>
              ))}
            </select>
          )}

          <div>
            <label className={ADMIN_LABEL}>Thank-you note</label>
            <textarea
              value={thankYouNote}
              onChange={(e) => setThankYouNote(e.target.value)}
              rows={2}
              className={ADMIN_INPUT}
            />
          </div>
        </div>
      )}

      <div className="flex gap-4">
        <div className="flex-1">
          <label className={ADMIN_LABEL}>Price paid (EUR)</label>
          <input
            type="number"
            step="0.01"
            min="0"
            value={pricePaid}
            onChange={(e) => setPricePaid(e.target.value)}
            className={ADMIN_INPUT}
          />
        </div>
        <div className="flex-1">
          <label className={ADMIN_LABEL}>Received date</label>
          <input
            type="date"
            value={receivedDate}
            onChange={(e) => setReceivedDate(e.target.value)}
            className={ADMIN_INPUT}
          />
        </div>
      </div>

      <div>
        <label className={ADMIN_LABEL}>Move to collection</label>
        <select
          value={collectionId}
          onChange={(e) => setCollectionId(e.target.value ? Number(e.target.value) : '')}
          className={ADMIN_INPUT}
        >
          <option value="">Select a collection...</option>
          {collections
            ?.filter((c) => !c.is_wishlist)
            .map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
        </select>
      </div>

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={markReceived.isPending || !collectionId}
          className={ADMIN_BUTTON_PRIMARY}
        >
          {markReceived.isPending ? 'Saving...' : `Mark as received & move to ${targetName}`}
        </button>
        {markReceived.isError && <span className="text-sm text-red-600">Failed to save.</span>}
      </div>
    </form>
  )
}
