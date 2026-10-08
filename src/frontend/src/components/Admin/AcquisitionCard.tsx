import { useState, type FormEvent } from 'react'
import { useGifters } from '../../api/gifters'
import type { ItemDetail } from '../../api/items'
import { useUpdateAcquisition } from '../../api/wishlistDetail'
import { useAdminLang } from '../../hooks/adminLang'
import {
  ADMIN_BUTTON_PRIMARY,
  ADMIN_BUTTON_SECONDARY,
  ADMIN_CARD,
  ADMIN_INPUT,
  ADMIN_LABEL,
  ADMIN_SEG,
  adminSegOption,
} from './adminUi'

/** Read-only summary of how a received item was acquired, with an inline
 * editor for the gifter and thank-you note of a gift. */
export function AcquisitionCard({ item }: { item: ItemDetail }) {
  const { t } = useAdminLang()
  const [editing, setEditing] = useState(false)
  const detail = item.wishlist_detail
  if (!detail) return null

  const gifted = detail.acquisition_type === 'gifted'

  return (
    <div className={`mt-6 ${ADMIN_CARD}`}>
      <div className="mb-2 flex items-center justify-between">
        <h3 className="font-semibold text-[var(--admin-text)]">{t.acquisitionDetails}</h3>
        {gifted && !editing && (
          <button type="button" onClick={() => setEditing(true)} className={ADMIN_BUTTON_SECONDARY}>
            {t.edit}
          </button>
        )}
      </div>

      {editing ? (
        <AcquisitionEditor item={item} onDone={() => setEditing(false)} />
      ) : (
        <div className="space-y-1 text-sm">
          <div>
            {gifted ? (
              <>
                {t.gift}: {t.giftedBy}{' '}
                <strong>
                  {detail.gifter?.name ?? detail.gifter_name_override ?? t.noGifterOnFile}
                </strong>
              </>
            ) : (
              t.selfPurchase
            )}
          </div>
          {detail.thank_you_note && (
            <div>
              {t.thankYouNote}: {detail.thank_you_note}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function AcquisitionEditor({ item, onDone }: { item: ItemDetail; onDone: () => void }) {
  const { t } = useAdminLang()
  const { data: gifters } = useGifters()
  const update = useUpdateAcquisition(item.id)
  const detail = item.wishlist_detail!

  const [mode, setMode] = useState<'pick' | 'oneoff'>(
    !detail.gifter && detail.gifter_name_override ? 'oneoff' : 'pick',
  )
  const [gifterId, setGifterId] = useState(detail.gifter ? String(detail.gifter.id) : '')
  const [gifterName, setGifterName] = useState(detail.gifter_name_override ?? '')
  const [note, setNote] = useState(detail.thank_you_note ?? '')

  function handleSubmit(event: FormEvent) {
    event.preventDefault()
    update.mutate(
      {
        gifter_id: mode === 'pick' && gifterId ? Number(gifterId) : null,
        gifter_name_override: mode === 'oneoff' ? gifterName.trim() || null : null,
        thank_you_note: note.trim() || null,
      },
      { onSuccess: onDone },
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <label className={ADMIN_LABEL}>{t.gifter}</label>
        <div className={ADMIN_SEG}>
          <button
            type="button"
            onClick={() => setMode('pick')}
            className={adminSegOption(mode === 'pick')}
          >
            {t.pick}
          </button>
          <button
            type="button"
            onClick={() => setMode('oneoff')}
            className={adminSegOption(mode === 'oneoff')}
          >
            {t.oneoff}
          </button>
        </div>
      </div>

      {mode === 'pick' ? (
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
      ) : (
        <input
          type="text"
          value={gifterName}
          onChange={(e) => setGifterName(e.target.value)}
          placeholder={t.gifterNameOptional}
          maxLength={255}
          className={ADMIN_INPUT}
        />
      )}

      <div>
        <label className={ADMIN_LABEL}>{t.thankYouNote}</label>
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={3}
          className={ADMIN_INPUT}
        />
      </div>

      <div className="flex items-center gap-3">
        <button type="submit" disabled={update.isPending} className={ADMIN_BUTTON_PRIMARY}>
          {update.isPending ? t.saving : t.save}
        </button>
        <button type="button" onClick={onDone} className={ADMIN_BUTTON_SECONDARY}>
          {t.cancel}
        </button>
        {update.isError && (
          <span className="text-sm text-[var(--admin-accent-700)]">{t.saveFailed}</span>
        )}
      </div>
    </form>
  )
}
