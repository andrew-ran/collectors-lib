import { useState, type FormEvent } from 'react'
import { useSiteSettings, useUpdateSiteSettings, type SiteSettings } from '../../api/settings'

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
    return <p>Loading settings...</p>
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
    <form onSubmit={handleSubmit} style={{ marginTop: '2rem' }}>
      <h2>Site settings</h2>
      <p style={{ color: '#666', fontSize: '0.9rem' }}>
        Used for the browser tab title and meta description. Leave blank to use the default.
      </p>

      <div style={{ marginBottom: '1rem' }}>
        <label htmlFor="site_title" style={{ display: 'block', marginBottom: '0.25rem' }}>
          Site title
        </label>
        <input
          id="site_title"
          type="text"
          value={title}
          maxLength={255}
          placeholder="Collectors Lib"
          onChange={(e) => setTitle(e.target.value)}
          style={{ width: '100%', padding: '0.5rem' }}
        />
      </div>

      <div style={{ marginBottom: '1rem' }}>
        <label htmlFor="site_description" style={{ display: 'block', marginBottom: '0.25rem' }}>
          Site description
        </label>
        <textarea
          id="site_description"
          value={description}
          maxLength={DESCRIPTION_MAX}
          rows={3}
          placeholder="The collection tracker your friends check before they buy you a gift."
          onChange={(e) => setDescription(e.target.value)}
          style={{ width: '100%', padding: '0.5rem' }}
        />
        <span style={{ color: '#666', fontSize: '0.8rem' }}>
          {description.length}/{DESCRIPTION_MAX}
        </span>
      </div>

      <button type="submit" disabled={updateSettings.isPending}>
        {updateSettings.isPending ? 'Saving...' : 'Save'}
      </button>
      {updateSettings.isSuccess && (
        <span style={{ marginLeft: '0.75rem', color: 'green' }}>Saved.</span>
      )}
      {updateSettings.isError && (
        <span style={{ marginLeft: '0.75rem', color: 'crimson' }}>
          Failed to save -- try again.
        </span>
      )}
    </form>
  )
}
