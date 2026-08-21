<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Setting;
use Illuminate\Http\Request;

/**
 * US-180 -- admin-configurable site title/description. `show()` is public
 * (the SPA and, eventually, any server-side templating step both need to
 * read these); `update()` is admin-only.
 *
 * NOTE (US-181 scope): this only covers the client-rendered <title>/meta
 * description via useSiteMeta() -- it does NOT yet make these values
 * visible to chat-app link-preview bots or search engines, since those
 * don't execute JavaScript. That requires Laravel to serve the built SPA
 * through a templated route instead of nginx serving a static index.html,
 * which only makes sense once there's a production build to serve (Phase
 * 3, see ARCHITECTURE.md "SEO & Site Meta Tags" and docs/tz/TECH_DEBT.md).
 */
class SiteSettingsController extends Controller
{
    /** Defaults used until the admin sets these for the first time -- see
     * PROJECT.md's naming/tagline decision. */
    private const DEFAULTS = [
        'site_title' => 'Collectors Lib',
        'site_description' => 'The collection tracker your friends check before they buy you a gift.',
    ];

    public function show()
    {
        $settings = Setting::whereIn('key', array_keys(self::DEFAULTS))
            ->get()
            ->pluck('value', 'key');

        // ?: (not ??) on purpose -- an empty-string value (admin cleared the
        // field) should fall back to the default too, not display blank.
        return response()->json([
            'site_title' => $settings['site_title'] ?: self::DEFAULTS['site_title'],
            'site_description' => $settings['site_description'] ?: self::DEFAULTS['site_description'],
        ]);
    }

    public function update(Request $request)
    {
        $validated = $request->validate([
            'site_title' => ['nullable', 'string', 'max:255'],
            'site_description' => ['nullable', 'string', 'max:300'],
        ]);

        foreach ($validated as $key => $value) {
            Setting::updateOrCreate(
                ['key' => $key],
                ['value' => $value, 'updated_at' => now()],
            );
        }

        return $this->show();
    }
}
