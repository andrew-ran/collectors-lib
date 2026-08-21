import { useEffect } from 'react'
import { useSiteSettings } from '../api/settings'

/**
 * US-180 -- sets document.title and <meta name="description"> from the
 * admin-configured site settings, once they load. Call this once near the
 * app root (App.tsx), not per-page.
 *
 * Scope note (see SiteSettingsController's docblock and
 * docs/tz/TECH_DEBT.md): this only reaches visitors whose browser actually
 * runs the React bundle. Chat-app link-preview bots and search-engine
 * crawlers don't execute JavaScript, so they still see whatever nginx/
 * index.html serves statically -- that's US-181, deferred until there's a
 * production SPA build for Laravel to template server-side.
 */
export function useSiteMeta() {
  const { data } = useSiteSettings()

  useEffect(() => {
    if (!data) return

    document.title = data.site_title

    let meta = document.querySelector<HTMLMetaElement>('meta[name="description"]')

    if (!meta) {
      meta = document.createElement('meta')
      meta.setAttribute('name', 'description')
      document.head.appendChild(meta)
    }

    meta.setAttribute('content', data.site_description)
  }, [data])
}
