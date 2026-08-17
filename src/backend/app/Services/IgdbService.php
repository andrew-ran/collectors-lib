<?php

namespace App\Services;

use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use RuntimeException;

/**
 * IGDB client (Twitch OAuth + Apicalypse queries). See docs/API_SOURCES.md.
 * Verified live end-to-end 2026-08-17.
 */
class IgdbService
{
    private const TOKEN_URL = 'https://id.twitch.tv/oauth2/token';

    private const BASE_URL = 'https://api.igdb.com/v4';

    private const GAME_FIELDS = <<<'FIELDS'
        name, summary, genres.name, platforms.id, platforms.name, platforms.abbreviation,
        cover.url, franchises.id, franchises.name,
        involved_companies.company.id, involved_companies.company.name,
        involved_companies.developer, involved_companies.publisher,
        similar_games.name, similar_games.id,
        remakes.name, remakes.id, remasters.name, remasters.id,
        dlcs.name, dlcs.id, first_release_date
        FIELDS;

    private string $clientId;

    private string $clientSecret;

    public function __construct()
    {
        $this->clientId = (string) config('services.igdb.client_id');
        $this->clientSecret = (string) config('services.igdb.client_secret');
    }

    /**
     * Search by title. Returns IGDB's raw result array (id, name, cover,
     * first_release_date, platforms) -- see API_SOURCES.md's Search Flow.
     */
    public function search(string $query, int $limit = 10): array
    {
        $body = 'search "'.$this->escape($query)."\";\n"
            // platforms.name is needed (not just .abbreviation) so a
            // not-yet-seen platform can be matched/created locally by name --
            // see IgdbSearchController (US-110).
            .'fields id, name, cover.url, first_release_date, platforms.id, platforms.name, platforms.abbreviation;'."\n"
            ."limit {$limit};";

        return $this->query('games', $body);
    }

    /**
     * Full game record by IGDB ID, used by ScrapeItemMetadataJob.
     */
    public function find(int $igdbId): ?array
    {
        $body = 'fields '.self::GAME_FIELDS.";\n".'where id = '.$igdbId.';';

        $results = $this->query('games', $body);

        return $results[0] ?? null;
    }

    private function query(string $endpoint, string $apicalypseBody): array
    {
        $response = Http::withHeaders([
            'Client-ID' => $this->clientId,
            'Authorization' => 'Bearer '.$this->getAccessToken(),
        ])
            ->withBody($apicalypseBody, 'text/plain')
            ->post(self::BASE_URL."/{$endpoint}")
            ->throw();

        return $response->json();
    }

    /**
     * Twitch app access tokens last ~60 days -- cached and refreshed
     * automatically once expired. See API_SOURCES.md, Setup.
     */
    private function getAccessToken(): string
    {
        return Cache::remember('igdb_access_token', now()->addDays(55), function () {
            $response = Http::asForm()->post(self::TOKEN_URL, [
                'client_id' => $this->clientId,
                'client_secret' => $this->clientSecret,
                'grant_type' => 'client_credentials',
            ])->throw();

            return $response->json('access_token')
                ?? throw new RuntimeException('IGDB/Twitch did not return an access token.');
        });
    }

    private function escape(string $value): string
    {
        return str_replace('"', '\\"', $value);
    }
}
