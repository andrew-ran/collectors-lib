import { useState, type FormEvent } from 'react'
import { useSiteSettings, useUpdateSiteSettings, type SiteSettings } from '../../api/settings'
import { ADMIN_BUTTON_PRIMARY, ADMIN_CARD, ADMIN_INPUT, ADMIN_LABEL } from './adminUi'

const DESCRIPTION_MAX = 300

/** US-180 -- lets the admin set the site-wide title/description used for
 * <title>, meta description, and (once US-181's server-side templating
 * lands, see docs/tz/TECH_DEBT.md) Open Graph tags. Leaving a field blank
 * and saving resets it to the built-in default rather than storing an
 * empty value -- see SiteSettingsController::show()'s `?:` fallback.
 *
 * Split into a loading gate + an inner form so the form's fields can seed
 * from `settings` via a plain useState initializer (derived state on
 * mount, not an effect + setState -- see react-hooks/set-state-in-effect)
 * instead of copying async data into local state after the fact. */
export function SiteSettingsAdmin() {
  const { data: settings, isLoading } = useSiteSettings()

  if (isLoading || !settings) {
    return <p className="mt-8 text-neutral-500">Loading settings...</p>
  }

  return <SiteSettingsForm settings={settings} />
}

function SiteSettingsForm({ settings }: { settings: SiteSettings }) {
  const updateSettings = useUpdateSiteSettings()

  const [title, setTitle] = useState(settings.site_title)
  const [description, setDescription] = useState(settings.site_description)

  function handleSubmit(event: FormEvent) {
    event.preventDefault()
    updateSettings.mutate({ site_title: title, site_description: description })
  }

  return (
    <form onSubmit={handleSubmit} className={`mt-8 space-y-4 ${ADMIN_CARD}`}>
      <div>
        <h2 className="text-lg font-semibold text-neutral-900">Site settings</h2>
        <p className="mt-1 text-sm text-neutral-500">
          Used for the browser tab title and meta description. Leave blank to use the default.
        </p>
      </div>

      <div>
        <label htmlFor="site_title" className={ADMIN_LABEL}>
          Site title
        </label>
        <input
          id="site_title"
          type="text"
          value={title}
          maxLength={255}
          placeholder="Collectors Lib"
          onChange={(e) => setTitle(e.target.value)}
          className={ADMIN_INPUT}
        />
      </div>

      <div>
        <label htmlFor="site_description" className={ADMIN_LABEL}>
          Site description
        </label>
        <textarea
          id="site_description"
          value={description}
          maxLength={DESCRIPTION_MAX}
          rows={3}
          placeholder="The collection tracker your friends check before they buy you a gift."
          onChange={(e) => setDescription(e.target.value)}
          className={ADMIN_INPUT}
        />
        <span className="text-sm text-neutral-500">
          {description.length}/{DESCRIPTION_MAX}
        </span>
      </div>

      <div className="flex items-center gap-3">
        <button type="submit" disabled={updateSettings.isPending} className={ADMIN_BUTTON_PRIMARY}>
          {updateSettings.isPending ? 'Saving...' : 'Save'}
        </button>
        {updateSettings.isSuccess && <span className="text-sm text-green-700">Saved.</span>}
        {updateSettings.isError && (
          <span className="text-sm text-red-600">Failed to save -- try again.</span>
        )}
      </div>
    </form>
  )
}
