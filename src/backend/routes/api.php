<?php

use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\CollectionController;
use App\Http\Controllers\Api\DictionaryController;
use App\Http\Controllers\Api\ExchangeRateController;
use App\Http\Controllers\Api\GifterController;
use App\Http\Controllers\Api\IgdbSearchController;
use App\Http\Controllers\Api\ItemController;
use App\Http\Controllers\Api\SiteSettingsController;
use Illuminate\Support\Facades\Route;

// Phase 0 sanity check -- see ROADMAP.md Phase 0 deliverable.
Route::get('/health', function () {
    return response()->json(['status' => 'ok']);
});

Route::middleware('throttle:api')->group(function () {
    // US-100 -- stricter throttle on top of the general API one, see
    // AppServiceProvider's 'login' rate limiter.
    Route::middleware('throttle:login')->post('/auth/login', [AuthController::class, 'login']);

    // Public browsing -- no auth required, see ARCHITECTURE.md Authentication.
    // filter-options must stay above {item} or Laravel tries to bind it as
    // an item id (US-006a).
    Route::get('/items/filter-options', [ItemController::class, 'filterOptions']);
    Route::get('/items', [ItemController::class, 'index']);
    Route::get('/items/{item}', [ItemController::class, 'show']);
    Route::get('/collections', [CollectionController::class, 'index']);

    // US-170/171 -- cached EUR-based rates for the currency selector.
    Route::get('/exchange-rates', [ExchangeRateController::class, 'index']);

    // US-180 -- public read so the SPA can set <title>/meta description
    // client-side; editing is admin-only below. See SiteSettingsController's
    // docblock for what this does and doesn't cover re: US-181.
    Route::get('/settings', [SiteSettingsController::class, 'show']);

    Route::middleware('auth:sanctum')->group(function () {
        Route::post('/auth/logout', [AuthController::class, 'logout']); // US-102
        Route::get('/auth/me', [AuthController::class, 'me']); // US-101

        Route::post('/items', [ItemController::class, 'store']);
        Route::put('/items/{item}', [ItemController::class, 'update']);
        Route::delete('/items/{item}', [ItemController::class, 'destroy']); // US-115
        Route::post('/items/{item}/rescrape', [ItemController::class, 'rescrape']); // US-113

        // US-110 -- admin-only IGDB search for the "add item" flow.
        Route::get('/search/igdb', [IgdbSearchController::class, 'search']);

        // US-112 -- edit-form autocomplete dictionaries, see DictionaryController.
        Route::get('/platforms', [DictionaryController::class, 'platforms']);
        Route::get('/genres', [DictionaryController::class, 'genres']);
        Route::get('/franchises', [DictionaryController::class, 'franchises']);
        Route::get('/companies', [DictionaryController::class, 'companies']);

        Route::put('/settings', [SiteSettingsController::class, 'update']); // US-180

        // US-130/131/132/133 -- collection admin (index() stays public, above).
        Route::post('/collections', [CollectionController::class, 'store']);
        Route::put('/collections/{collection}', [CollectionController::class, 'update']);
        Route::delete('/collections/{collection}', [CollectionController::class, 'destroy']);

        // US-160/161 -- gifter profile CRUD, admin-only (no public listing).
        Route::get('/gifters', [GifterController::class, 'index']);
        Route::post('/gifters', [GifterController::class, 'store']);
        Route::post('/gifters/{gifter}', [GifterController::class, 'update']); // multipart PUT spoofing, see api/gifters.ts
        Route::delete('/gifters/{gifter}', [GifterController::class, 'destroy']);
    });
});
