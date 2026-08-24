/**
 * Shared design tokens/class strings for the admin screens (login,
 * dashboard, add-item, edit-item, item list, site settings). Through
 * Phase 1-3 this was a deliberately minimal Tailwind pass (real buttons
 * instead of text links, visible input borders, white/gray block grouping)
 * -- see git history for that version. As of 2026-08, this is a real design
 * pass: tokens ported from a Claude Design handoff (docs/design/ -- prompted
 * via docs/design/CLAUDE_DESIGN_BRIEF.md), a flat "Modernist" system (single
 * red accent, 2px rules, Archivo, zero border radius). The actual CSS
 * variables live in index.css under `.admin-theme`, which wraps the whole
 * /admin route subtree (see App.tsx) so none of this leaks into the public
 * SPA's own approved look. One shared file instead of repeating these
 * strings in every admin page/component so the look stays consistent.
 */

export const ADMIN_PAGE = 'mx-auto max-w-5xl px-6 py-8'

export const ADMIN_CARD = 'border border-[var(--admin-divider)] bg-[var(--admin-surface)] p-4'

export const ADMIN_LABEL = 'mb-1 block text-xs font-medium text-[var(--admin-text-muted)]'

export const ADMIN_INPUT =
  'w-full rounded-none border-2 border-[var(--admin-divider)] bg-[var(--admin-surface)] px-3 py-2 text-sm text-[var(--admin-text)] focus:border-[var(--admin-accent)] focus:outline-none'

export const ADMIN_BUTTON_PRIMARY =
  'inline-flex items-center justify-center gap-1.5 rounded-none bg-[var(--admin-accent)] px-4 py-2 text-sm font-semibold text-white hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-50'

export const ADMIN_BUTTON_SECONDARY =
  'inline-flex items-center justify-center gap-1.5 rounded-none border-2 border-[var(--admin-divider)] bg-[var(--admin-surface)] px-4 py-2 text-sm font-medium text-[var(--admin-text)] hover:bg-[var(--admin-neutral-50)] disabled:cursor-not-allowed disabled:opacity-50'

export const ADMIN_BUTTON_DANGER =
  'inline-flex items-center justify-center gap-1.5 rounded-none border-2 border-[var(--admin-divider)] bg-[var(--admin-surface)] px-4 py-2 text-sm font-medium text-[var(--admin-accent-700)] hover:bg-[var(--admin-neutral-50)] disabled:cursor-not-allowed disabled:opacity-50'

export const ADMIN_BUTTON_GHOST =
  'inline-flex items-center gap-1.5 rounded-none px-1 py-1 text-sm text-[var(--admin-text)] underline decoration-[var(--admin-divider)] hover:decoration-[var(--admin-text)]'

export const ADMIN_LINK =
  'text-sm text-[var(--admin-text-muted)] underline hover:text-[var(--admin-text)]'

export const ADMIN_DIVIDER = 'border-t-2 border-[var(--admin-divider)]'

/** Segmented control (2-3 mutually exclusive modes -- entry type, gift/self
 * purchase, gifter pick/one-off/new). Wrap a row of ADMIN_SEG_OPTION
 * buttons in ADMIN_SEG. */
export const ADMIN_SEG = 'inline-flex border-2 border-[var(--admin-divider)]'

export function adminSegOption(active: boolean): string {
  return [
    'inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium',
    active
      ? 'bg-[var(--admin-accent)] text-white'
      : 'bg-[var(--admin-surface)] text-[var(--admin-text)] hover:bg-[var(--admin-neutral-50)]',
  ].join(' ')
}

/** Soft, per-item-type pill colors for the admin item list (US-112
 * follow-up) -- distinct from the system's single red accent on purpose, so
 * type is scannable at a glance across a long table. Applied via inline
 * `style`, not a Tailwind class, since these are OKLCH values Tailwind's
 * static-analysis-based JIT can't pick up from a dynamic key. Matches
 * ItemType (App\Enums\ItemType) 1:1. */
export const TYPE_TAG_COLORS: Record<string, { bg: string; fg: string }> = {
  game: { bg: 'oklch(90% 0.06 250)', fg: 'oklch(35% 0.09 250)' },
  book: { bg: 'oklch(92% 0.07 90)', fg: 'oklch(38% 0.09 80)' },
  console: { bg: 'oklch(90% 0.06 300)', fg: 'oklch(38% 0.09 300)' },
  peripheral: { bg: 'oklch(90% 0.07 150)', fg: 'oklch(36% 0.09 150)' },
}

export const ADMIN_TAG_NEUTRAL =
  'inline-flex items-center rounded-none bg-[var(--admin-neutral-100)] px-2 py-0.5 text-xs font-medium text-[var(--admin-text)]'

export const ADMIN_TAG_ACCENT =
  'inline-flex items-center rounded-none bg-[var(--admin-accent)] px-2 py-0.5 text-xs font-medium text-white'

export const ADMIN_TAG_OUTLINE =
  'inline-flex items-center gap-1 rounded-none border border-[var(--admin-divider)] bg-[var(--admin-surface)] px-2 py-0.5 text-xs text-[var(--admin-text)]'
