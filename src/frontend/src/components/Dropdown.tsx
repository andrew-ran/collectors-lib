import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'

/** Shared select-list dropdown behavior (US-006a's height rule applies to
 * Platform/Genre/Series/Sort/collection-switcher/currency dropdowns alike):
 * up to 4 rows visible then internally scrollable, same width as the
 * trigger button, closes on outside click or Escape. */
export function Dropdown({
  trigger,
  disabled,
  triggerClassName,
  children,
}: {
  trigger: ReactNode
  disabled?: boolean
  triggerClassName?: string
  children: (close: () => void) => ReactNode
}) {
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const close = useCallback(() => setOpen(false), [])

  useEffect(() => {
    if (!open) return

    function onPointerDown(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        close()
      }
    }

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') close()
    }

    document.addEventListener('mousedown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)

    return () => {
      document.removeEventListener('mousedown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [open, close])

  return (
    <div ref={containerRef} className="relative inline-block">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        disabled={disabled}
        aria-expanded={open}
        className={
          triggerClassName ??
          'flex items-center gap-1.5 rounded-full border border-neutral-200 bg-white px-3 py-1 text-sm text-neutral-600 transition hover:bg-neutral-50 disabled:cursor-not-allowed disabled:opacity-40'
        }
      >
        {trigger}
        <svg
          viewBox="0 0 24 24"
          fill="none"
          className={`h-3.5 w-3.5 shrink-0 text-neutral-400 transition-transform ${open ? 'rotate-180' : ''}`}
        >
          <path
            d="M6 9l6 6 6-6"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>

      {open && !disabled && (
        <div className="absolute top-full left-0 z-10 mt-1 max-h-40 w-full min-w-max overflow-y-auto rounded-lg border border-neutral-200 bg-white py-1 shadow-md">
          {children(close)}
        </div>
      )}
    </div>
  )
}

export function DropdownItem({
  active,
  disabled,
  onClick,
  children,
}: {
  active?: boolean
  /** US-170's currency list -- an item can be individually grayed out/
   * non-clickable (e.g. no cached exchange rate yet), same idea as
   * US-006a's whole-dropdown disabled state but per-row. */
  disabled?: boolean
  onClick: () => void
  children: ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`block w-full px-3 py-2 text-left text-sm whitespace-nowrap hover:bg-neutral-50 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent ${
        active ? 'font-medium text-neutral-900' : 'text-neutral-600'
      }`}
    >
      {children}
    </button>
  )
}
