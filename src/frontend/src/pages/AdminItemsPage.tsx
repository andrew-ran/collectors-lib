import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useCollections } from '../api/collections'
import { useFranchiseOptions, useGenreOptions, usePlatformOptions } from '../api/dictionaries'
import { SCRAPE_STATUS_LABEL, useAdminItemList, type ItemSummary } from '../api/items'
import { useDebouncedValue } from '../hooks/useDebouncedValue'
import { CURRENCIES, CURRENCY_META, useCurrency, type Currency } from '../hooks/currency'
import { useAdminLang } from '../hooks/adminLang'
import { AdminLangSwitch } from '../components/Admin/AdminLangSwitch'
import { Pencil } from '../components/Admin/icons'
import {
  ADMIN_INPUT,
  ADMIN_LABEL,
  ADMIN_LINK,
  ADMIN_TAG_ACCENT,
  TYPE_TAG_COLORS,
} from '../components/Admin/adminUi'

/** Admin item list -- lets the admin find and jump into editing any item
 * without knowing its id or hunting through the public site first (the gap
 * flagged in docs/tz/TECH_DEBT.md right after AdminEditItemPage shipped).
 * Reuses the public GET /api/items endpoint as-is (search/collection/
 * platform/genre/franchise filters were already supported server-side --
 * see items.ts's useAdminItemList) rather than a dedicated admin endpoint.
 *
 * 2026-08 redesign: rebuilt on the Modernist tokens from the Claude Design
 * handoff (docs/design/CLAUDE_DESIGN_BRIEF.md) -- per-type colored pills, a
 * cover-art wash behind each row's title cell, a display-currency select
 * that reuses the same CurrencyProvider/useCurrency() the public SPA has
 * used since US-170 (now mounted at the app root, see App.tsx, instead of
 * only around the public collection view), and the admin's new language
 * switcher (hooks/adminLang.ts). Previously a plain unstyled table. */
export function AdminItemsPage() {
  const location = useLocation()
  const { t } = useAdminLang()
  const { currency, setCurrency, availableCurrencies, formatPrice } = useCurrency()

  const { data: collections } = useCollections()
  const { data: platforms } = usePlatformOptions()
  const { data: genres } = useGenreOptions()
  const { data: franchises } = useFranchiseOptions()

  const [collectionId, setCollectionId] = useState<number | null>(null)
  const [platformId, setPlatformId] = useState<number | null>(null)
  const [genreId, setGenreId] = useState<number | null>(null)
  const [franchiseId, setFranchiseId] = useState<number | null>(null)
  const [query, setQuery] = useState('')
  const debouncedQuery = useDebouncedValue(query)

  const { data, isLoading } = useAdminItemList({
    collectionId,
    q: debouncedQuery,
    platformId,
    genreId,
    franchiseId,
  })

  // AdminEditItemPage returns here (this exact search/filter) after
  // Save/Delete -- see resolveReturnTo() there.
  const returnTo = `${location.pathname}${location.search}`

  function itemPrice(item: ItemSummary): string | null {
    if (item.wishlist_detail) {
      const estimate =
        item.wishlist_detail.price_new_estimate ?? item.wishlist_detail.price_used_estimate
      const formatted = formatPrice(estimate)

      return formatted ? `~${formatted}` : null
    }

    return formatPrice(item.purchase_price)
  }

  return (
    <div className="mx-auto max-w-6xl px-6 py-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="mb-2">
            <Link to="/admin" className={ADMIN_LINK}>
              &larr; Admin
            </Link>
          </p>
          <h1 className="text-2xl font-bold tracking-tight text-[var(--admin-text)]">
            {t.listTitle}
          </h1>
          <p className="mt-0.5 text-sm text-[var(--admin-text-muted)]">{t.listSubtitle}</p>
        </div>
        <div className="flex flex-wrap items-end gap-3">
          <AdminLangSwitch />
          <div className="min-w-[140px]">
            <label className={ADMIN_LABEL}>{t.displayCurrency}</label>
            <select
              value={currency}
              onChange={(e) => setCurrency(e.target.value as Currency)}
              className={ADMIN_INPUT}
            >
              {CURRENCIES.filter((c) => availableCurrencies.includes(c)).map((c) => (
                <option key={c} value={c}>
                  {c} {CURRENCY_META[c].suffix}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="my-4 flex flex-wrap gap-3">
        <div className="min-w-[200px] flex-1">
          <label className={ADMIN_LABEL}>{t.search}</label>
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t.searchPlaceholder}
            className={ADMIN_INPUT}
          />
        </div>
        <div className="min-w-[150px]">
          <label className={ADMIN_LABEL}>{t.platform}</label>
          <select
            value={platformId ?? ''}
            onChange={(e) => setPlatformId(e.target.value ? Number(e.target.value) : null)}
            className={ADMIN_INPUT}
          >
            <option value="">{t.all}</option>
            {platforms?.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>
        <div className="min-w-[150px]">
          <label className={ADMIN_LABEL}>{t.genre}</label>
          <select
            value={genreId ?? ''}
            onChange={(e) => setGenreId(e.target.value ? Number(e.target.value) : null)}
            className={ADMIN_INPUT}
          >
            <option value="">{t.all}</option>
            {genres?.map((g) => (
              <option key={g.id} value={g.id}>
                {g.name}
              </option>
            ))}
          </select>
        </div>
        <div className="min-w-[150px]">
          <label className={ADMIN_LABEL}>{t.collection}</label>
          <select
            value={collectionId ?? ''}
            onChange={(e) => setCollectionId(e.target.value ? Number(e.target.value) : null)}
            className={ADMIN_INPUT}
          >
            <option value="">{t.all}</option>
            {collections?.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
        <div className="min-w-[150px]">
          <label className={ADMIN_LABEL}>{t.franchise}</label>
          <select
            value={franchiseId ?? ''}
            onChange={(e) => setFranchiseId(e.target.value ? Number(e.target.value) : null)}
            className={ADMIN_INPUT}
          >
            <option value="">{t.all}</option>
            {franchises?.map((f) => (
              <option key={f.id} value={f.id}>
                {f.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {isLoading && <p className="text-[var(--admin-text-muted)]">{t.loading}</p>}

      {!isLoading && data?.data.length === 0 && (
        <p className="text-[var(--admin-text-muted)]">{t.noItems}</p>
      )}

      {!isLoading && data && data.data.length > 0 && (
        <table className="w-full border-2 border-[var(--admin-divider)] text-left text-sm">
          <thead>
            <tr className="border-b-2 border-[var(--admin-divider)] text-[var(--admin-text-muted)]">
              <th className="px-3 py-2 font-medium">{t.colItem}</th>
              <th className="px-3 py-2 font-medium">{t.colType}</th>
              <th className="px-3 py-2 font-medium">{t.colPlatform}</th>
              <th className="px-3 py-2 font-medium">{t.colCollection}</th>
              <th className="px-3 py-2 font-medium">{t.colStatus}</th>
              <th className="px-3 py-2 font-medium">{t.colPrice}</th>
              <th className="px-3 py-2" />
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--admin-divider)]">
            {data.data.map((item) => {
              const tc = TYPE_TAG_COLORS[item.type] ?? TYPE_TAG_COLORS.game
              const typeLabel =
                { game: t.game, book: t.book, console: t.console, peripheral: t.peripheral }[
                  item.type
                ] ?? item.type
              const price = itemPrice(item)

              return (
                <tr key={item.id}>
                  <td className="relative overflow-hidden px-3 py-2">
                    {item.cover_url && (
                      <div
                        aria-hidden
                        className="absolute inset-0"
                        style={{
                          backgroundImage: `url(${item.cover_url})`,
                          backgroundSize: 'cover',
                          backgroundPosition: 'center',
                          WebkitMaskImage:
                            'linear-gradient(to right, rgba(0,0,0,0.5), rgba(0,0,0,0.1))',
                          maskImage: 'linear-gradient(to right, rgba(0,0,0,0.5), rgba(0,0,0,0.1))',
                        }}
                      />
                    )}
                    <div className="relative flex items-center gap-2.5">
                      {item.cover_url ? (
                        <img src={item.cover_url} alt="" className="h-[38px] w-7 object-cover" />
                      ) : (
                        <div className="h-[38px] w-7 flex-none" style={{ background: tc.bg }} />
                      )}
                      <span className="font-semibold text-[var(--admin-text)]">{item.title}</span>
                    </div>
                  </td>
                  <td className="px-3 py-2">
                    <span
                      className="inline-flex items-center px-2 py-0.5 text-xs font-medium"
                      style={{ background: tc.bg, color: tc.fg }}
                    >
                      {typeLabel}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-[var(--admin-text)]">
                    {item.platform?.name ?? '—'}
                  </td>
                  <td className="px-3 py-2">
                    {item.wishlist_detail ? (
                      <span className={ADMIN_TAG_ACCENT}>{t.wishlist}</span>
                    ) : (
                      <span className="text-[var(--admin-text-muted)]">
                        {item.collection?.name ?? t.myCollection}
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-2 text-[var(--admin-text-muted)]">
                    {SCRAPE_STATUS_LABEL[item.scrape_status]}
                  </td>
                  <td className="px-3 py-2 text-[var(--admin-text)]">{price ?? '—'}</td>
                  <td className="px-3 py-2 text-right">
                    <Link
                      to={`/admin/items/${item.id}/edit`}
                      state={{ from: returnTo }}
                      className="inline-flex items-center gap-1.5 border-2 border-[var(--admin-divider)] bg-[var(--admin-surface)] px-2.5 py-1 text-xs font-medium text-[var(--admin-text)] hover:bg-[var(--admin-neutral-50)]"
                    >
                      <Pencil width={13} height={13} /> {t.edit}
                    </Link>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      )}
    </div>
  )
}
