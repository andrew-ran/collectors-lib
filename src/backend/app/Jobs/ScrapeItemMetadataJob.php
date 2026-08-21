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
 * Fetches IGDB metadata for an item and stores it in item_metadata,
 * matching/creating franchise + company rows along the way. See
 * ARCHITECTURE.md's Request Flow and API_SOURCES.md's "ScrapeItemMetadataJob
 * flow". Exercised live end-to-end 2026-08-17.
 *
 * Dispatched automatically by ItemController::store() when an item is
 * created with an igdb_id, and again on demand by
 * ItemController::rescrape() (US-113). Either way, any field the admin has
 * manually edited via the edit form (US-112, see
 * ItemController::applyMetadataInput()) is skipped here -- see
 * manual_overrides/$isOverridden() below.
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
        $related = $this->relatedByFranchise($igdb, $game);

        // US-112/113 -- a field the admin has manually edited is left alone
        // by re-scrape; everything else is always refreshed (including the
        // fields that were never editable in the admin form to begin with:
        // other_platforms/sequels/prequels/dlcs/igdb_raw/release_year).
        // manual_overrides itself is deliberately not overwritten here, so
        // the flags set by ItemController::applyMetadataInput() survive.
        $overrides = $item->metadata?->manual_overrides ?? [];
        $isOverridden = fn (string $field) => (bool) ($overrides[$field] ?? false);

        $metadataAttributes = [
            'release_year' => isset($game['first_release_date'])
                ? gmdate('Y', $game['first_release_date'])
                : null,
            'other_platforms' => $game['platforms'] ?? [],
            'sequels' => $related['sequels'],
            'prequels' => $related['prequels'],
            'dlcs' => $game['dlcs'] ?? [],
            'igdb_raw' => $game,
        ];

        if (! $isOverridden('description')) {
            $metadataAttributes['description'] = $game['summary'] ?? null;
        }

        if (! $isOverridden('franchise_id')) {
            $metadataAttributes['franchise_id'] = $this->matchFranchise($game['franchises'][0] ?? null);
        }

        if (! $isOverridden('developer')) {
            $metadataAttributes['developer'] = $this->companyName($involvedCompanies, developer: true);
        }

        if (! $isOverridden('publisher')) {
            $metadataAttributes['publisher'] = $this->companyName($involvedCompanies, developer: false);
        }

        if (! $isOverridden('remakes')) {
            $metadataAttributes['remakes'] = $game['remakes'] ?? [];
        }

        if (! $isOverridden('remasters')) {
            // Captured but not shown in the UI yet -- see US-011 tech debt
            // note, may be surfaced alongside remakes later.
            $metadataAttributes['remasters'] = $game['remasters'] ?? [];
        }

        $item->metadata()->updateOrCreate([], $metadataAttributes);

        $this->matchCompanies($involvedCompanies);

        if (! $isOverridden('genres')) {
            $item->genres()->sync($this->matchGenres($game['genres'] ?? []));
        }

        $item->update([
            'scrape_status' => ScrapeStatus::Scraped,
            'scraped_at' => now(),
            // IGDB is the authoritative title once an igdb_id is set -- the
            // title supplied at creation (e.g. a search-result label or a
            // placeholder) is always superseded by the scrape, unless the
            // admin has since manually edited it (US-112).
            'title' => $isOverridden('title') ? $item->title : ($game['name'] ?? $item->title),
        ]);

        // Cover download + WebP conversion (ImageService) is a separate,
        // not-yet-built follow-up -- see ARCHITECTURE.md's ImageService.
    }

    /**
     * US-011's "sequels/prequels" fields are approximated, not exact --
     * IGDB has no direct sequel/prequel relation on the Game object (only
     * franchise/collection membership + similar_games, a fuzzy similarity
     * match we deliberately don't use here anymore). This takes every other
     * game sharing the item's first IGDB franchise and splits it by
     * first_release_date relative to this game's own release date: earlier
     * = prequel, later = sequel. That also catches spin-offs, side games,
     * and re-releases in the same franchise, not just direct numbered
     * entries -- a known limitation, tracked in docs/tz/TECH_DEBT.md for a
     * more precise rework later. Games with no franchise or no release date
     * (either the current game's, or a candidate's) can't be classified and
     * are skipped.
     *
     * @return array{sequels: array<int, array{id: int, name: string}>, prequels: array<int, array{id: int, name: string}>}
     */
    private function relatedByFranchise(IgdbService $igdb, array $game): array
    {
        $franchiseIgdbId = $game['franchises'][0]['id'] ?? null;
        $releaseDate = $game['first_release_date'] ?? null;

        if (! $franchiseIgdbId || ! $releaseDate) {
            return ['sequels' => [], 'prequels' => []];
        }

        $franchiseGames = $igdb->gamesInFranchise($franchiseIgdbId, $game['id']);

        $prequels = [];
        $sequels = [];

        foreach ($franchiseGames as $related) {
            if (! isset($related['first_release_date'])) {
                continue;
            }

            $ref = ['id' => $related['id'], 'name' => $related['name']];

            if ($related['first_release_date'] < $releaseDate) {
                $prequels[] = $ref;
            } elseif ($related['first_release_date'] > $releaseDate) {
                $sequels[] = $ref;
            }
        }

        return ['sequels' => $sequels, 'prequels' => $prequels];
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
