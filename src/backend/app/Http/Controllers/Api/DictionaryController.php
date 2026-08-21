<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Company;
use App\Models\Franchise;
use App\Models\Genre;
use App\Models\Platform;

/**
 * US-112 -- read-only lookups backing the edit form's Genre/Franchise/
 * Developer/Publisher autocomplete fields. Admin-only: nothing here is
 * sensitive, but nothing outside the edit form needs it either, so there's
 * no reason to add public surface for it. Plain full-list responses, not
 * server-side search -- see DictionaryController's class docblock reasoning
 * in docs/tz/TECH_DEBT.md if these ever need to be paginated/searched
 * instead (this project already assumes "dozens to low hundreds" scale
 * elsewhere, e.g. ItemController's docblock, and these dictionaries grow
 * slower than the item count).
 */
class DictionaryController extends Controller
{
    /** US-112's Platform select needs every platform, not just the ones
     * already used in the current collection (that's ItemController::
     * filterOptions()'s narrower, collection-scoped list). */
    public function platforms()
    {
        return response()->json(Platform::orderBy('name')->get(['id', 'name', 'abbreviation']));
    }

    public function genres()
    {
        return response()->json(Genre::orderBy('name')->get(['id', 'name']));
    }

    public function franchises()
    {
        return response()->json(Franchise::orderBy('name')->get(['id', 'name']));
    }

    /** Plain strings, not {id, name} -- developer/publisher are free-text
     * columns on item_metadata (not a FK), so the form only needs names to
     * suggest, see DATABASE_SCHEMA.md's companies note. */
    public function companies()
    {
        return response()->json(Company::orderBy('name')->pluck('name'));
    }
}
