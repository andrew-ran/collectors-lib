<?php

use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\CollectionController;
use App\Http\Controllers\Api\DictionaryController;
use App\Http\Controllers\Api\ExchangeRateController;
use App\Http\Controllers\Api\GifterController;
use App\Http\Controllers\Api\IgdbSearchController;
use App\Http\Controllers\Api\ItemController;
use App\Http\Controllers\Api\ItemPhotoController;
use App\Http\Controllers\Api\SiteSettingsController;
use App\Http\Controllers\Api\WishlistDetailController;
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

        // US-117/118/119/120 -- admin-uploaded item photos.
        Route::post('/items/{item}/photos', [ItemPhotoController::class, 'store']);
        Route::put('/items/{item}/photos/reorder', [ItemPhotoController::class, 'reorder']);
        Route::put('/items/{item}/photos/{photo}/primary', [ItemPhotoController::class, 'setPrimary']);
        Route::delete('/items/{item}/photos/{photo}', [ItemPhotoController::class, 'destroy']);

        // US-150/151 -- wishlist admin fields + mark-as-received flow.
        Route::put('/items/{item}/wishlist-detail', [WishlistDetailController::class, 'update']);
        Route::post('/items/{item}/mark-received', [WishlistDetailController::class, 'markReceived']);

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
        // Registered as PUT, not POST: Laravel's _method spoofing (needed so
        // PHP populates $_FILES on a multipart body, see api/gifters.ts)
        // overrides the *routed* method to PUT before matching, so the real
        // transport method being POST doesn't matter here -- only the route
        // declaration's method does. Was wrongly Route::post() before this
        // was caught by GifterControllerTest's avatar-replace/rename tests
        // (405 Method Not Allowed on every real spoofed PUT).
        Route::put('/gifters/{gifter}', [GifterController::class, 'update']);
        Route::delete('/gifters/{gifter}', [GifterController::class, 'destroy']);
    });
});
