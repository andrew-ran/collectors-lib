import { createContext, useContext } from 'react'

/** US-170 -- the five currencies the wishlist can display prices in. Order
 * here is also the dropdown's display order (EUR first, as the default/
 * base currency). */
export const CURRENCIES = ['EUR', 'USD', 'RUB', 'PLN', 'RSD'] as const
export type Currency = (typeof CURRENCIES)[number]

export const CURRENCY_META: Record<Currency, { flag: string; suffix: string }> = {
  EUR: { flag: '🇪🇺', suffix: '€' },
  USD: { flag: '🇺🇸', suffix: '$' },
  RUB: { flag: '🇷🇺', suffix: '₽' },
  PLN: { flag: '🇵🇱', suffix: 'pln' },
  RSD: { flag: '🇷🇸', suffix: 'din' },
}

export const CURRENCY_STORAGE_KEY = 'collectors-lib:currency'

/** US-171's per-currency rounding rule. */
export function roundForCurrency(currency: Currency, raw: number): number {
  if (currency === 'RUB') return Math.round(raw / 10) * 10
  if (currency === 'RSD') return Math.round(raw / 100) * 100

  return Math.round(raw)
}

export function formatThousands(n: number): string {
  return n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ')
}

export interface CurrencyContextValue {
  currency: Currency
  setCurrency: (currency: Currency) => void
  /** US-006a-style disabled state -- only currencies with a cached rate
   * (EUR always included) are actually selectable. */
  availableCurrencies: Currency[]
  /** Converts a EUR-stored price (string/number, as WishlistDetailRef's
   * price fields are) to the selected currency, rounded and formatted per
   * US-171 (e.g. "~1 270 ₽"). Returns null for a null/unparseable input. */
  formatPrice: (eurAmount: string | number | null) => string | null
  /** Added for the 2026-08 admin redesign's purchase-price currency pickers
   * (AdminEditItemPage, WishlistAdminPanel's mark-as-received dialog) --
   * the app always *stores* prices in EUR (see PROJECT.md), the currency
   * picker there is a data-entry convenience only, so an admin-entered
   * amount in e.g. USD has to be converted to EUR before it's sent to the
   * API. The inverse of formatPrice(), unrounded (rounding a value about to
   * be stored, not just displayed, would lose precision) and unformatted
   * (caller owns the input's live value). Returns null if there's no cached
   * rate yet for `currency`. */
  convertToEur: (amount: number, currency: Currency) => number | null
}

// Defined in this plain hook/constants module, not the .tsx provider file --
// react-refresh/only-export-components requires component-exporting files
// to *only* export components.
export const CurrencyContext = createContext<CurrencyContextValue | null>(null)

export function useCurrency(): CurrencyContextValue {
  const ctx = useContext(CurrencyContext)

  if (!ctx) {
    throw new Error('useCurrency() must be used within a CurrencyProvider')
  }

  return ctx
}
