<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;

/**
 * OpenLibrary client (US-121 -- add a book by ISBN). See docs/API_SOURCES.md.
 * Unlike IgdbService, no auth/token dance -- OpenLibrary's public API needs
 * no credentials at all.
 */
class OpenLibraryService
{
    private const BOOKS_URL = 'https://openlibrary.org/api/books';

    /**
     * Looks up a single book by ISBN via OpenLibrary's Books API (bibkeys
     * lookup, not the fuzzy title `search.json` endpoint -- an ISBN is
     * exact, so there's exactly one match or none, unlike IGDB's title
     * search returning multiple candidates to pick from).
     *
     * @return array{isbn: string, title: string|null, author: string|null, publisher: string|null, year: int|null, cover_url: string|null}|null
     *              null when OpenLibrary has no record for this ISBN.
     */
    public function findByIsbn(string $isbn): ?array
    {
        $bibkey = "ISBN:{$isbn}";

        $response = Http::get(self::BOOKS_URL, [
            'bibkeys' => $bibkey,
            'format' => 'json',
            'jscmd' => 'data',
        ])->throw();

        $data = $response->json($bibkey);

        if (! $data) {
            return null;
        }

        return [
            'isbn' => $isbn,
            'title' => $data['title'] ?? null,
            'author' => $this->joinNames($data['authors'] ?? []),
            'publisher' => $this->joinNames($data['publishers'] ?? []),
            'year' => $this->extractYear($data['publish_date'] ?? null),
            'cover_url' => $data['cover']['large'] ?? $data['cover']['medium'] ?? null,
        ];
    }

    /**
     * @param  array<int, array{name?: string}>  $entries
     */
    private function joinNames(array $entries): ?string
    {
        $names = array_filter(array_column($entries, 'name'));

        return $names ? implode(', ', $names) : null;
    }

    /**
     * OpenLibrary's publish_date is free text ("1998", "March 1998",
     * "1998-03-01") -- just pull the first 4-digit year out of it rather
     * than trying to fully parse every format it might return.
     */
    private function extractYear(?string $publishDate): ?int
    {
        if ($publishDate && preg_match('/\d{4}/', $publishDate, $matches)) {
            return (int) $matches[0];
        }

        return null;
    }
}
