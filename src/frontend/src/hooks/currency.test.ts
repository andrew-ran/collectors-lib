import { describe, expect, it } from 'vitest'
import { formatThousands, roundForCurrency } from './currency'

describe('roundForCurrency', () => {
  it('rounds RUB to the nearest 10', () => {
    expect(roundForCurrency('RUB', 1234)).toBe(1230)
    expect(roundForCurrency('RUB', 1235)).toBe(1240)
    expect(roundForCurrency('RUB', 1236)).toBe(1240)
  })

  it('rounds RSD to the nearest 100', () => {
    expect(roundForCurrency('RSD', 1234)).toBe(1200)
    expect(roundForCurrency('RSD', 1251)).toBe(1300)
  })

  it('rounds everything else to the nearest whole unit', () => {
    expect(roundForCurrency('EUR', 19.6)).toBe(20)
    expect(roundForCurrency('USD', 19.4)).toBe(19)
    expect(roundForCurrency('PLN', 19.5)).toBe(20)
  })
})

describe('formatThousands', () => {
  it('leaves small numbers untouched', () => {
    expect(formatThousands(42)).toBe('42')
  })

  it('inserts a thin space every three digits from the right', () => {
    expect(formatThousands(1234)).toBe('1 234')
    expect(formatThousands(1234567)).toBe('1 234 567')
  })
})
