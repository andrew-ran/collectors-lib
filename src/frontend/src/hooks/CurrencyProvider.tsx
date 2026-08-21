import { useQuery } from '@tanstack/react-query'
import { useMemo, useState, type ReactNode } from 'react'
import { apiClient } from '../api/client'
import {
  CURRENCIES,
  CURRENCY_META,
  CURRENCY_STORAGE_KEY,
  CurrencyContext,
  formatThousands,
  roundForCurrency,
  type Currency,
} from './currency'

/** GET /api/exchange-rates -- EUR is always 1 (implicit base); the other
 * four only appear once ExchangeRateSyncJob has actually cached a rate for
 * them (decimal columns come back as strings, like every other decimal
 * field in this API -- see ItemDetail's price fields). */
function useExchangeRates() {
  return useQuery({
    queryKey: ['exchange-rates'],
    queryFn: async () => {
      const { data } = await apiClient.get<Partial<Record<Currency, string>>>('/exchange-rates')

      return data
    },
    staleTime: 60 * 60 * 1000,
  })
}

/** US-170 -- provides the selected display currency (persisted to
 * localStorage), the cached exchange rates, and a formatPrice() helper.
 * The context/hook itself live in ./currency (a plain, non-JSX module) so
 * this file can stay component-only -- react-refresh/only-export-components
 * disallows mixing a hook/constants export with a component export in the
 * same file. */
export function CurrencyProvider({ children }: { children: ReactNode }) {
  const { data: rates } = useExchangeRates()

  const [currency, setCurrencyState] = useState<Currency>(() => {
    const stored = window.localStorage.getItem(CURRENCY_STORAGE_KEY)

    return (CURRENCIES as readonly string[]).includes(stored ?? '') ? (stored as Currency) : 'EUR'
  })

  function setCurrency(next: Currency) {
    setCurrencyState(next)
    window.localStorage.setItem(CURRENCY_STORAGE_KEY, next)
  }

  const availableCurrencies = useMemo(
    () => CURRENCIES.filter((c) => c === 'EUR' || rates?.[c] !== undefined),
    [rates],
  )

  function formatPrice(eurAmount: string | number | null): string | null {
    if (eurAmount === null) return null

    const eur = typeof eurAmount === 'string' ? Number(eurAmount) : eurAmount
    if (!Number.isFinite(eur)) return null

    const rate = currency === 'EUR' ? 1 : Number(rates?.[currency] ?? NaN)
    if (!Number.isFinite(rate)) return null

    const rounded = roundForCurrency(currency, eur * rate)

    return `~${formatThousands(rounded)} ${CURRENCY_META[currency].suffix}`
  }

  return (
    <CurrencyContext.Provider value={{ currency, setCurrency, availableCurrencies, formatPrice }}>
      {children}
    </CurrencyContext.Provider>
  )
}
