<?php

namespace App\Jobs;

use App\Enums\ScrapeStatus;
use App\Models\Company;
use App\Models\Franchise;
use App\Models\Genre;
use App\Models\Item;
use App\Services\IgdbService;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Str;

/**
 * Fetches IGDB metadata for a newly-added item and stores it in
 * item_metadata, matching/creating franchise + company rows along the way.
 * See ARCHITECTURE.md's Request Flow and API_SOURCES.md's
 * "ScrapeItemMetadataJob flow".
 *
 * Not yet exercised end-to-end -- blocked on IgdbService's credentials (see
 * its docblock). Dispatched automatically by ItemController::store() when
 * an item is created with an igdb_id, so this starts working the moment
 * IGDB_CLIENT_ID/IGDB_CLIENT_SECRET are set -- nothing else to wire up.
 */
class ScrapeItemMetadataJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $tries = 3;

    public function __construct(private readonly int $itemId) {}

    public function handle(IgdbService $igdb): void
    {
        $item = Item::findOrFail($this->itemId);

        if (! $item->igdb_id) {
            return;
        }

        $item->update(['scrape_status' => ScrapeStatus::Scraping]);

        $game = $igdb->find($item->igdb_id);

        if (! $game) {
            $item->update(['scrape_status' => ScrapeStatus::Failed]);

            return;
        }

        $involvedCompanies = $game['involved_companies'] ?? [];

        $item->metadata()->updateOrCreate([], [
            'description' => $game['summary'] ?? null,
            'release_year' => isset($game['first_release_date'])
                ? gmdate('Y', $game['first_release_date'])
                : null,
            'franchise_id' => $this->matchFranchise($game['franchises'][0] ?? null),
            'developer' => $this->companyName($involvedCompanies, developer: true),
            'publisher' => $this->companyName($involvedCompanies, developer: false),
            'other_platforms' => $game['platforms'] ?? [],
            'sequels' => $game['similar_games'] ?? [],
            'prequels' => [],
            'remakes' => $game['remakes'] ?? [],
            'dlcs' => $game['dlcs'] ?? [],
            'igdb_raw' => $game,
        ]);

        $this->matchCompanies($involvedCompanies);
        $item->genres()->sync($this->matchGenres($game['genres'] ?? []));

        $item->update([
            'scrape_status' => ScrapeStatus::Scraped,
            'scraped_at' => now(),
            // IGDB is the authoritative title once an igdb_id is set -- the
            // title supplied at creation (e.g. a search-result label or a
            // placeholder) is always superseded by the scrape.
            'title' => $game['name'] ?? $item->title,
        ]);

        // Cover download + WebP conversion (ImageService) is a separate,
        // not-yet-built follow-up -- see ARCHITECTURE.md's ImageService.
    }

    private function matchFranchise(?array $franchise): ?int
    {
        if (! $franchise) {
            return null;
        }

        return Franchise::firstOrCreate(
            ['igdb_id' => $franchise['id']],
            ['name' => $franchise['name'], 'slug' => Str::slug($franchise['name'])],
        )->id;
    }

    /**
     * @param  array<int, array{id: int, name: string}>  $genres
     * @return array<int, int> Genre ids, for item->genres()->sync().
     */
    private function matchGenres(array $genres): array
    {
        return collect($genres)
            ->map(fn (array $genre) => Genre::firstOrCreate(
                ['igdb_id' => $genre['id']],
                ['name' => $genre['name'], 'slug' => Str::slug($genre['name'])],
            )->id)
            ->all();
    }

    private function matchCompanies(array $involvedCompanies): void
    {
        foreach ($involvedCompanies as $involved) {
            $company = $involved['company'] ?? null;

            if (! $company) {
                continue;
            }

            Company::firstOrCreate(
                ['igdb_id' => $company['id']],
                ['name' => $company['name']],
            );
        }
    }

    private function companyName(array $involvedCompanies, bool $developer): ?string
    {
        $key = $developer ? 'developer' : 'publisher';

        foreach ($involvedCompanies as $involved) {
            if (($involved[$key] ?? false) && isset($involved['company']['name'])) {
                return $involved['company']['name'];
            }
        }

        return null;
    }
}
