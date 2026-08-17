<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Collection;

/**
 * Read-only collection list -- public like the rest of GET /api/*, see
 * ARCHITECTURE.md Authentication. Used by the public SPA's collection
 * switcher (Phase 2, US-001b) and the admin "add item" collection picker
 * (US-110).
 */
class CollectionController extends Controller
{
    public function index()
    {
        return response()->json(
            Collection::query()->orderBy('sort_order')->get(),
        );
    }
}
