import { useSyncExternalStore } from 'react'

// Matches Tailwind's default `md` breakpoint -- see docs/tz/REQUIREMENTS.md
// 3.4 Mobile View. Below this, the collection view switches from desktop's
// one-item-at-a-time Item View to the mobile Table/Item View (US-030/031).
const QUERY = '(max-width: 767px)'

function subscribe(callback: () => void): () => void {
  const mql = window.matchMedia(QUERY)
  mql.addEventListener('change', callback)

  return () => mql.removeEventListener('change', callback)
}

/** useSyncExternalStore, not useState+useEffect -- the viewport's match
 * state is an external browser API, not something derived from props/render
 * that would trip the project's set-state-in-effect convention. */
export function useIsMobile(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia(QUERY).matches,
    () => false,
  )
}
