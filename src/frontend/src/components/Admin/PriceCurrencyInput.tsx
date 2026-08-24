import { useState } from 'react'
import { CURRENCIES, useCurrency, type Currency } from '../../hooks/currency'
import { ADMIN_INPUT } from './adminUi'

/**
 * Currency-picker + amount input for the two admin price fields the 2026-08
 * redesign added a picker to (AdminEditItemPage's purchase price,
 * WishlistAdminPanel's mark-as-received price paid) -- see
 * docs/design/CLAUDE_DESIGN_BRIEF.md. Prices are always *stored* in EUR
 * (PROJECT.md) -- this is a data-entry convenience only. The parent still
 * owns the actual EUR string that goes in the save payload (same
 * `purchasePrice`/`pricePaid` useState as before); this component just
 * calls `onChangeEurValue` with the converted amount.
 *
 * Deliberately does *not* try to back-convert an existing EUR value into a
 * newly picked currency (e.g. switching from EUR to USD doesn't retroactively
 * show the EUR amount converted to USD) -- that would need a second,
 * EUR-to-X conversion path alongside useCurrency()'s existing X-to-EUR
 * (convertToEur) one, for a case (re-entering a price you're actively
 * editing) that's rare enough not to be worth the extra surface. Switching
 * currency simply starts a fresh entry in that currency.
 */
export function PriceCurrencyInput({
  eurValue,
  onChangeEurValue,
}: {
  /** The current EUR-stored value, as the parent form's own state has it
   * (e.g. AdminEditItemPage's `purchasePrice`). Only used to seed the input
   * while still in EUR mode. */
  eurValue: string
  onChangeEurValue: (eurValue: string) => void
}) {
  const { availableCurrencies, convertToEur } = useCurrency()
  const [inputCurrency, setInputCurrency] = useState<Currency>('EUR')
  const [rawValue, setRawValue] = useState(eurValue)

  function handleValueChange(next: string) {
    setRawValue(next)

    if (inputCurrency === 'EUR') {
      onChangeEurValue(next)
      return
    }

    const parsed = parseFloat(next)

    if (!Number.isFinite(parsed)) {
      onChangeEurValue('')
      return
    }

    const eur = convertToEur(parsed, inputCurrency)
    onChangeEurValue(eur !== null ? String(eur) : '')
  }

  function handleCurrencyChange(next: Currency) {
    setInputCurrency(next)
    setRawValue('')
    onChangeEurValue('')
  }

  const parsedRaw = parseFloat(rawValue)
  const previewEur =
    inputCurrency !== 'EUR' && rawValue !== '' && Number.isFinite(parsedRaw)
      ? convertToEur(parsedRaw, inputCurrency)
      : null

  return (
    <div className="flex gap-1.5">
      <select
        value={inputCurrency}
        onChange={(e) => handleCurrencyChange(e.target.value as Currency)}
        className={`${ADMIN_INPUT} w-[84px] flex-none`}
      >
        {CURRENCIES.filter((c) => availableCurrencies.includes(c)).map((c) => (
          <option key={c} value={c}>
            {c}
          </option>
        ))}
      </select>
      <div className="relative flex-1">
        <input
          type="number"
          step="0.01"
          min="0"
          value={rawValue}
          onChange={(e) => handleValueChange(e.target.value)}
          className={ADMIN_INPUT}
        />
        {previewEur !== null && (
          <span className="pointer-events-none absolute top-1/2 right-2.5 -translate-y-1/2 text-xs text-[var(--admin-neutral-500)]">
            ≈ €{previewEur.toFixed(2)}
          </span>
        )}
      </div>
    </div>
  )
}
