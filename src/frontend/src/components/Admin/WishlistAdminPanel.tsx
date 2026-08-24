import { useRef, useState, type FormEvent } from 'react'
import { useCollections, type Collection } from '../../api/collections'
import { useCreateGifter, useGifters } from '../../api/gifters'
import { useMarkItemReceived, useUpdateWishlistDetail } from '../../api/wishlistDetail'
import type { AcquisitionType, ConditionPreference, ItemDetail } from '../../api/items'
import { useAdminLang } from '../../hooks/adminLang'
import { PriceCurrencyInput } from './PriceCurrencyInput'
import { Gift, UserPlus, Wallet } from './icons'
import {
  ADMIN_BUTTON_PRIMARY,
  ADMIN_BUTTON_SECONDARY,
  ADMIN_CARD,
  ADMIN_DIVIDER,
  ADMIN_INPUT,
  ADMIN_LABEL,
  ADMIN_SEG,
  adminSegOption,
} from './adminUi'

function conditionOptions(t: ReturnType<typeof useAdminLang>['t']): {
  value: ConditionPreference
  label: string
}[] {
  return [
    { value: 'new_only', label: t.newOnly },
    { value: 'used_ok', label: t.usedOk },
    { value: 'cartridge_only', label: t.cartridgeOnly },
  ]
}

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
 *    cached item can't drift apart from each other.
 * 2. US-151/162/163 "mark as received" -- a Gifted/Self-purchased toggle
 *    with progressive disclosure, a gifter picker OR a one-off name OR an
 *    inline "+ Add new gifter" mini-form (exactly one of the three, never
 *    combined), thank-you note, price paid, received date, and a destination
 *    collection. The inline add form reuses `useCreateGifter()` directly
 *    rather than sending the admin away to GiftersAdmin.tsx and back: on
 *    success it switches straight back to the picker with the brand new
 *    gifter pre-selected. Confirming moves the item out of the wishlist
 *    entirely, at which point this whole panel disappears from its parent.
 *
 * 2026-08 redesign: visuals rebuilt on the Modernist tokens from the Claude
 * Design handoff (docs/design/CLAUDE_DESIGN_BRIEF.md) -- segmented controls
 * for acquisition type and gifter mode (previously plain buttons/links),
 * PriceCurrencyInput for price paid. All the mutation/state logic above is
 * unchanged from the original US-150/151/162/163 implementation.
 */
export function WishlistAdminPanel({ item }: { item: ItemDetail }) {
  const { t } = useAdminLang()

  return (
    <div className={`space-y-6 ${ADMIN_CARD}`}>
      <h2 className="text-lg font-bold text-[var(--admin-text)]">{t.wishlistSection}</h2>
      <WishlistFieldsForm item={item} />
      <div className={`${ADMIN_DIVIDER} pt-6`}>
        <MarkReceivedForm item={item} />
      </div>
    </div>
  )
}

function WishlistFieldsForm({ item }: { item: ItemDetail }) {
  const { t } = useAdminLang()
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
          <label className={ADMIN_LABEL}>{t.conditionPreference}</label>
          <select
            value={conditionPreference}
            onChange={(e) => setConditionPreference(e.target.value as ConditionPreference | '')}
            className={ADMIN_INPUT}
          >
            <option value="">{t.noPreference}</option>
            {conditionOptions(t).map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
        <div className="flex-1">
          <label className={ADMIN_LABEL}>
            {t.desireScore} ({desireScore}%)
          </label>
          <input
            type="range"
            min={0}
            max={100}
            value={desireScore}
            onChange={(e) => setDesireScore(Number(e.target.value))}
            className="mt-3 w-full accent-[var(--admin-accent)]"
          />
        </div>
      </div>

      <div>
        <label className={ADMIN_LABEL}>{t.editionNote}</label>
        <input
          type="text"
          value={editionNote}
          onChange={(e) => setEditionNote(e.target.value)}
          className={ADMIN_INPUT}
        />
      </div>

      <div className="flex gap-4">
        <div className="flex-1">
          <label className={ADMIN_LABEL}>{t.priceEstimateNew} (EUR)</label>
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
          <label className={ADMIN_LABEL}>{t.priceEstimateUsed} (EUR)</label>
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
          {updateDetail.isPending ? t.saving : t.saveWishlistDetails}
        </button>
        {updateDetail.isSuccess && (
          <span className="text-sm text-[var(--admin-text)]">{t.saved}</span>
        )}
        {updateDetail.isError && (
          <span className="text-sm text-[var(--admin-accent-700)]">{t.saveFailed}</span>
        )}
      </div>
    </form>
  )
}

type GifterInputMode = 'pick' | 'oneoff' | 'new'

function MarkReceivedForm({ item }: { item: ItemDetail }) {
  const { t } = useAdminLang()
  const { data: collections } = useCollections()
  const { data: gifters } = useGifters()
  const markReceived = useMarkItemReceived(item.id)
  const createGifter = useCreateGifter()

  const defaultCollection = collections?.find((c: Collection) => c.is_default && !c.is_wishlist)

  const [acquisitionType, setAcquisitionType] = useState<AcquisitionType>('gifted')
  const [gifterId, setGifterId] = useState('')
  const [gifterMode, setGifterMode] = useState<GifterInputMode>('pick')
  const [gifterName, setGifterName] = useState('')
  const [newGifterName, setNewGifterName] = useState('')
  const newGifterAvatarRef = useRef<HTMLInputElement>(null)
  const [thankYouNote, setThankYouNote] = useState('')
  const [pricePaid, setPricePaid] = useState('')
  const [receivedDate, setReceivedDate] = useState(todayIsoDate())
  const [collectionId, setCollectionId] = useState<number | ''>(defaultCollection?.id ?? '')

  const gifted = acquisitionType === 'gifted'

  function handleCreateGifter() {
    const avatar = newGifterAvatarRef.current?.files?.[0] ?? null

    createGifter.mutate(
      { name: newGifterName, avatar },
      {
        onSuccess: (newGifter) => {
          setGifterId(String(newGifter.id))
          setGifterMode('pick')
          setNewGifterName('')
          if (newGifterAvatarRef.current) newGifterAvatarRef.current.value = ''
        },
      },
    )
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault()
    if (!collectionId) return

    markReceived.mutate({
      acquisition_type: acquisitionType,
      gifter_id: gifted && gifterMode === 'pick' && gifterId ? Number(gifterId) : null,
      gifter_name_override: gifted && gifterMode === 'oneoff' ? gifterName || null : null,
      thank_you_note: gifted ? thankYouNote || null : null,
      price_paid: pricePaid || null,
      received_at: receivedDate,
      collection_id: collectionId,
    })
  }

  const targetName = collections?.find((c) => c.id === collectionId)?.name ?? '...'

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <h3 className="font-semibold text-[var(--admin-text)]">{t.markAsReceived}</h3>

      <div className={ADMIN_SEG}>
        <button
          type="button"
          onClick={() => setAcquisitionType('gifted')}
          className={adminSegOption(gifted)}
        >
          <Gift width={14} height={14} /> {t.gift}
        </button>
        <button
          type="button"
          onClick={() => setAcquisitionType('self_purchased')}
          className={adminSegOption(!gifted)}
        >
          <Wallet width={14} height={14} /> {t.selfPurchase}
        </button>
      </div>

      {gifted && (
        <div className="space-y-3 border border-[var(--admin-divider)] p-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <label className={ADMIN_LABEL}>{t.gifter}</label>
            <div className={ADMIN_SEG}>
              <button
                type="button"
                onClick={() => setGifterMode('pick')}
                className={adminSegOption(gifterMode === 'pick')}
              >
                {t.pick}
              </button>
              <button
                type="button"
                onClick={() => setGifterMode('oneoff')}
                className={adminSegOption(gifterMode === 'oneoff')}
              >
                {t.oneoff}
              </button>
              <button
                type="button"
                onClick={() => setGifterMode('new')}
                className={adminSegOption(gifterMode === 'new')}
              >
                <UserPlus width={13} height={13} /> {t.newGifter}
              </button>
            </div>
          </div>

          {gifterMode === 'oneoff' && (
            <input
              type="text"
              value={gifterName}
              onChange={(e) => setGifterName(e.target.value)}
              placeholder={t.gifterNameOptional}
              maxLength={255}
              className={ADMIN_INPUT}
            />
          )}

          {gifterMode === 'pick' && (
            <select
              value={gifterId}
              onChange={(e) => setGifterId(e.target.value)}
              className={ADMIN_INPUT}
            >
              <option value="">{t.noGifterSet}</option>
              {gifters?.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.name}
                </option>
              ))}
            </select>
          )}

          {gifterMode === 'new' && (
            <div className="space-y-2 bg-[var(--admin-bg)] p-3">
              <div>
                <label className={ADMIN_LABEL}>{t.name}</label>
                <input
                  type="text"
                  value={newGifterName}
                  onChange={(e) => setNewGifterName(e.target.value)}
                  maxLength={255}
                  className={ADMIN_INPUT}
                />
              </div>
              <div>
                <label className={ADMIN_LABEL}>{t.avatarOptional}</label>
                <input ref={newGifterAvatarRef} type="file" accept="image/*" className="text-sm" />
              </div>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={handleCreateGifter}
                  disabled={createGifter.isPending || !newGifterName.trim()}
                  className={ADMIN_BUTTON_SECONDARY}
                >
                  {createGifter.isPending ? t.adding : t.addGifter}
                </button>
                <button
                  type="button"
                  onClick={() => setGifterMode('pick')}
                  className="text-xs text-[var(--admin-text-muted)] underline hover:text-[var(--admin-text)]"
                >
                  {t.cancel}
                </button>
                {createGifter.isError && (
                  <span className="text-sm text-[var(--admin-accent-700)]">
                    Failed to create gifter.
                  </span>
                )}
              </div>
            </div>
          )}

          <div>
            <label className={ADMIN_LABEL}>{t.thankYouNote}</label>
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
          <label className={ADMIN_LABEL}>{t.pricePaid}</label>
          <PriceCurrencyInput eurValue={pricePaid} onChangeEurValue={setPricePaid} />
        </div>
        <div className="flex-1">
          <label className={ADMIN_LABEL}>{t.receivedDate}</label>
          <input
            type="date"
            value={receivedDate}
            onChange={(e) => setReceivedDate(e.target.value)}
            className={ADMIN_INPUT}
          />
        </div>
      </div>

      <div>
        <label className={ADMIN_LABEL}>{t.moveToCollection}</label>
        <select
          value={collectionId}
          onChange={(e) => setCollectionId(e.target.value ? Number(e.target.value) : '')}
          className={ADMIN_INPUT}
        >
          <option value="">{t.selectCollection}</option>
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
          {markReceived.isPending ? t.saving : `${t.confirmMarkReceived} → ${targetName}`}
        </button>
        {markReceived.isError && (
          <span className="text-sm text-[var(--admin-accent-700)]">{t.saveFailed}</span>
        )}
      </div>
    </form>
  )
}
