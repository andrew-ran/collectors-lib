<?php

namespace App\Http\Controllers\Api;

use App\Enums\AcquiredDatePrecision;
use App\Enums\ItemType;
use App\Enums\ScrapeStatus;
use App\Http\Controllers\Controller;
use App\Jobs\ScrapeItemMetadataJob;
use App\Models\Item;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

/**
 * Basic item CRUD (Phase 1). GET routes are intentionally public, no auth --
 * see ARCHITECTURE.md, Authentication ("All GET /api/* endpoints are public").
 * Write routes require auth:sanctum, wired in routes/api.php.
 *
 * This is a minimal foundation: full public browsing (filters, sort,
 * pagination shape for the SPA) is Phase 2 work on top of index()/show().
 * The IGDB-search add flow (US-110) is a separate piece pending IGDB
 * credentials -- see IgdbService -- store() here only covers manual add
 * (US-121 books, US-122 consoles/peripherals).
 */
class ItemController extends Controller
{
    public function index(Request $request)
    {
        // US-005's position indicator and Item View's prev/next navigation
        // need the full ordered id list for a collection in one request --
        // personal collections are realistically dozens to low hundreds of
        // items, so a per_page override (capped, not unbounded) is simpler
        // than a second "ids only" endpoint. Defaults to 50 for callers that
        // do want normal pagination.
        $perPage = min($request->integer('per_page', 50), 200);

        $items = Item::query()
            ->when(
                $request->integer('collection_id'),
                fn ($query, $collectionId) => $query->where('collection_id', $collectionId),
            )
            ->with(['platform', 'collection'])
            ->latest()
            ->paginate($perPage);

        return response()->json($items);
    }

    public function show(Item $item)
    {
        return response()->json(
            $item->load([
                'platform',
                'collection',
                'metadata.franchise',
                'photos',
                'genres',
                'wishlistDetail',
            ]),
        );
    }

    public function store(Request $request)
    {
        $validated = $this->validated($request);

        // Manually added items (no igdb_id) skip the scrape pipeline entirely.
        $validated['scrape_status'] = ! empty($validated['igdb_id'])
            ? ScrapeStatus::Pending->value
            : ScrapeStatus::Manual->value;

        $item = Item::create($validated);

        // Ready to run as soon as IGDB credentials exist -- see IgdbService.
        if ($item->igdb_id) {
            ScrapeItemMetadataJob::dispatch($item->id);
        }

        return response()->json($item, 201);
    }

    public function update(Request $request, Item $item)
    {
        $item->update($this->validated($request));

        return response()->json($item);
    }

    /**
     * US-115 -- admin can delete an item.
     */
    public function destroy(Item $item)
    {
        $item->delete();

        return response()->noContent();
    }

    private function validated(Request $request): array
    {
        return $request->validate([
            'collection_id' => ['required', 'exists:collections,id'],
            'type' => ['required', Rule::enum(ItemType::class)],
            'igdb_id' => ['nullable', 'integer'],
            'custom_identifier' => ['nullable', 'string', 'max:255'],
            'title' => ['required', 'string', 'max:500'],
            'subtitle' => ['nullable', 'string', 'max:500'],
            'platform_id' => ['nullable', 'exists:platforms,id'],
            // US-116 -- flexible acquired-date precision. The admin UI's date
            // widget enforces that both fields are set together (or both left
            // null for "unknown"); we just accept what it sends here.
            'acquired_date' => ['nullable', 'date'],
            'acquired_date_precision' => ['nullable', Rule::enum(AcquiredDatePrecision::class)],
            'purchase_price' => ['nullable', 'numeric', 'min:0'],
            'notes' => ['nullable', 'string'],
        ]);
    }
}
