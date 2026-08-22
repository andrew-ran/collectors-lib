import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useIsMobile } from './useIsMobile'

/** jsdom has no real layout engine, so `matchMedia` isn't implemented at
 * all -- this fakes just enough of the MediaQueryList API for useIsMobile's
 * useSyncExternalStore subscribe/getSnapshot pair to work, including
 * manually firing the 'change' listener to simulate a viewport resize. */
class FakeMediaQueryList {
  matches: boolean
  private listeners = new Set<() => void>()

  constructor(matches: boolean) {
    this.matches = matches
  }

  addEventListener(_event: 'change', callback: () => void) {
    this.listeners.add(callback)
  }

  removeEventListener(_event: 'change', callback: () => void) {
    this.listeners.delete(callback)
  }

  setMatches(matches: boolean) {
    this.matches = matches
    this.listeners.forEach((listener) => listener())
  }
}

let fakeMql: FakeMediaQueryList

beforeEach(() => {
  fakeMql = new FakeMediaQueryList(false)
  vi.stubGlobal(
    'matchMedia',
    vi.fn().mockImplementation(() => fakeMql),
  )
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('useIsMobile', () => {
  it('reflects the initial matchMedia state', () => {
    fakeMql = new FakeMediaQueryList(true)
    vi.stubGlobal(
      'matchMedia',
      vi.fn().mockImplementation(() => fakeMql),
    )

    const { result } = renderHook(() => useIsMobile())

    expect(result.current).toBe(true)
  })

  it('updates when the media query match state changes', () => {
    const { result } = renderHook(() => useIsMobile())

    expect(result.current).toBe(false)

    act(() => {
      fakeMql.setMatches(true)
    })

    expect(result.current).toBe(true)
  })
})
