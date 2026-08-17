import { useEffect, useState } from 'react'

/** US-110 step 2 -- "~400ms debounce (not on every keystroke, not only on
 * Enter)". */
export function useDebouncedValue<T>(value: T, delayMs = 400): T {
  const [debounced, setDebounced] = useState(value)

  useEffect(() => {
    const timeout = setTimeout(() => setDebounced(value), delayMs)

    return () => clearTimeout(timeout)
  }, [value, delayMs])

  return debounced
}
