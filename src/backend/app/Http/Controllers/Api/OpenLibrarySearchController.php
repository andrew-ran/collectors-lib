<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\OpenLibraryService;
use Illuminate\Http\Request;

/**
 * OpenLibrary ISBN lookup for the admin "add book" flow (US-121). See
 * docs/API_SOURCES.md "Books: OpenLibrary". Unlike IgdbSearchController's
 * title search (many fuzzy candidates), this is an exact single-record
 * lookup -- an ISBN either has a match or it doesn't, so the frontend shows
 * a preview to confirm/edit rather than a results list to pick from.
 */
class OpenLibrarySearchController extends Controller
{
    public function search(Request $request, OpenLibraryService $openLibrary)
    {
        $validated = $request->validate([
            'isbn' => ['required', 'string', 'max:32'],
        ]);

        // Admins will realistically paste ISBNs with dashes/spaces (as
        // printed on the book) -- OpenLibrary's bibkeys lookup wants a bare
        // digit string, so normalize before querying.
        $isbn = preg_replace('/[^0-9Xx]/', '', $validated['isbn']);

        $book = $openLibrary->findByIsbn($isbn);

        if (! $book) {
            return response()->json(
                ['message' => 'No book found for this ISBN -- you can still add it manually.'],
                404,
            );
        }

        return response()->json($book);
    }
}
