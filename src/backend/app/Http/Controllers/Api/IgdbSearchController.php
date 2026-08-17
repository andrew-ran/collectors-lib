<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Platform;
use App\Services\IgdbService;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

/**
 * IGDB search for the admin "add item" flow (US-110). See
 * docs/API_SOURCES.md "Search Flow (Admin: Add Item)".
 *
 * Platforms returned here are matched/created locally by igdb_id on the fly
 * (same firstOrCreate-on-first-sight pattern ScrapeItemMetadataJob uses for
 * franchises/companies/genres) so the frontend can submit a real local
 * platforms.id as `platform_id` when confirming the add -- no separate
 * platform sync job needed.
 */
class IgdbSearchController extends Controller
{
    public function search(Request $request, IgdbService $igdb)
    {
        $validated = $request->validate([
            'q' => ['required', 'string', 'min:1', 'max:255'],
        ]);

        $results = $igdb->search($validated['q'], 10);

        return response()->json(
            collect($results)->map(fn (array $game) => [
                'igdb_id' => $game['id'],
                'name' => $game['name'] ?? null,
                'year' => isset($game['first_release_date'])
                    ? (int) gmdate('Y', $game['first_release_date'])
                    : null,
                'cover_url' => $this->coverUrl($game['cover']['url'] ?? null),
                'platforms' => collect($game['platforms'] ?? [])
                    ->map(fn (array $platform) => $this->matchPlatform($platform))
                    ->all(),
            ]),
        );
    }

    /**
     * IGDB returns protocol-relative thumbnail URLs at t_thumb size -- see
     * docs/API_SOURCES.md "Cover Image URLs". t_cover_small is a closer fit
     * for a search-result list thumbnail than the default t_thumb.
     */
    private function coverUrl(?string $url): ?string
    {
        if (! $url) {
            return null;
        }

        return 'https:'.str_replace('t_thumb', 't_cover_small', $url);
    }

    /**
     * @param  array{id: int, name?: string, abbreviation?: string}  $platform
     * @return array{id: int, name: string, abbreviation: ?string}
     */
    private function matchPlatform(array $platform): array
    {
        $name = $platform['name'] ?? "IGDB platform #{$platform['id']}";
        $slug = Str::slug($name);

        // PlatformSeeder pre-seeded well-known platforms with igdb_id left
        // null (see its docblock). Matching by igdb_id alone would try to
        // insert a second row with the same slug and hit the unique
        // constraint -- fall back to matching an existing placeholder by
        // slug and backfill its igdb_id instead of creating a duplicate.
        $local = Platform::where('igdb_id', $platform['id'])->first()
            ?? Platform::where('slug', $slug)->first();

        if ($local) {
            $local->fill([
                'igdb_id' => $local->igdb_id ?? $platform['id'],
                'abbreviation' => $local->abbreviation ?? ($platform['abbreviation'] ?? null),
            ])->save();
        } else {
            $local = Platform::create([
                'igdb_id' => $platform['id'],
                'name' => $name,
                'slug' => $slug,
                'abbreviation' => $platform['abbreviation'] ?? null,
            ]);
        }

        return [
            'id' => $local->id,
            'name' => $local->name,
            'abbreviation' => $local->abbreviation,
        ];
    }
}
