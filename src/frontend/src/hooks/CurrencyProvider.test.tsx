import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { CurrencyProvider } from './CurrencyProvider'
import { useCurrency } from './currency'

vi.mock('../api/client', () => ({
  apiClient: {
    get: vi.fn().mockResolvedValue({
      data: { USD: '1.10', RUB: '95.4321' },
    }),
  },
}))

/** Exercises useCurrency() through a real CurrencyProvider rather than
 * calling formatPrice-adjacent pure functions directly -- this is the one
 * place the EUR-stored-price -> selected-currency conversion, US-171's
 * per-currency rounding, and the "~" prefix all actually compose together,
 * see CurrencyProvider.tsx's formatPrice(). */
function TestConsumer() {
  const { currency, setCurrency, availableCurrencies, formatPrice } = useCurrency()

  return (
    <div>
      <p data-testid="currency">{currency}</p>
      <p data-testid="available">{availableCurrencies.join(',')}</p>
      <p data-testid="formatted">{formatPrice('100') ?? 'null'}</p>
      <button onClick={() => setCurrency('RUB')}>Switch to RUB</button>
    </div>
  )
}

function renderWithProviders() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })

  return render(
    <QueryClientProvider client={queryClient}>
      <CurrencyProvider>
        <TestConsumer />
      </CurrencyProvider>
    </QueryClientProvider>,
  )
}

beforeEach(() => {
  window.localStorage.clear()
})

describe('CurrencyProvider / useCurrency', () => {
  it('defaults to EUR and formats the raw amount unconverted', async () => {
    renderWithProviders()

    expect(screen.getByTestId('currency')).toHaveTextContent('EUR')
    expect(screen.getByTestId('formatted')).toHaveTextContent('~100 €')

    // Let the mocked exchange-rates query settle before the test ends, so
    // its state update doesn't land outside any act()/waitFor() wrapper.
    await waitFor(() => expect(screen.getByTestId('available')).toHaveTextContent('USD'))
  })

  it('only lists EUR plus currencies with a cached rate as available', async () => {
    renderWithProviders()

    await waitFor(() => {
      expect(screen.getByTestId('available')).toHaveTextContent('EUR,USD,RUB')
    })
    // PLN/RSD have no rate in the mocked response, so they're excluded.
    expect(screen.getByTestId('available')).not.toHaveTextContent('PLN')
  })

  it('converts and rounds to the nearest 10 once switched to RUB, and persists the choice', async () => {
    const user = userEvent.setup()
    renderWithProviders()

    await waitFor(() => {
      expect(screen.getByTestId('available')).toHaveTextContent('RUB')
    })

    await user.click(screen.getByText('Switch to RUB'))

    // 100 EUR * 95.4321 = 9543.21 -> rounded to the nearest 10 (US-171).
    expect(screen.getByTestId('formatted')).toHaveTextContent('~9 540 ₽')
    expect(window.localStorage.getItem('collectors-lib:currency')).toBe('RUB')
  })
})
