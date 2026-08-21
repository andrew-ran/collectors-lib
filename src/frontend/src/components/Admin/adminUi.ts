/**
 * Shared Tailwind class strings for the admin screens (login, dashboard,
 * add-item, edit-item, site settings). The admin wasn't part of the design
 * sprint (only public views were mocked up, see AdminLoginPage's original
 * docblock) and stayed bare/unstyled through Phase 1-3 -- this is a
 * deliberately minimal pass (real buttons instead of text links, visible
 * input borders, white/gray block grouping), not a redesign. One shared
 * file instead of repeating these strings in every admin page/component so
 * the look stays consistent and a future real design pass has one place to
 * change.
 */

export const ADMIN_PAGE = 'mx-auto max-w-3xl px-4 py-8'

export const ADMIN_CARD = 'rounded-xl border border-neutral-200 bg-neutral-50 p-4'

export const ADMIN_LABEL = 'mb-1 block text-sm font-medium text-neutral-700'

export const ADMIN_INPUT =
  'w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 shadow-sm focus:border-neutral-500 focus:ring-1 focus:ring-neutral-500 focus:outline-none'

export const ADMIN_BUTTON_PRIMARY =
  'rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-700 disabled:cursor-not-allowed disabled:opacity-50'

export const ADMIN_BUTTON_SECONDARY =
  'rounded-md border border-neutral-300 bg-white px-4 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50 disabled:cursor-not-allowed disabled:opacity-50'

export const ADMIN_BUTTON_DANGER =
  'rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50'

export const ADMIN_LINK = 'text-sm text-neutral-500 underline hover:text-neutral-800'
