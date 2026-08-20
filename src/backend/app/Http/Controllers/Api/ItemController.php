<?php

namespace App\Http\Controllers\Api;

use App\Enums\AcquiredDatePrecision;
use App\Enums\ItemType;
use App\Enums\ScrapeStatus;
use App\Http\Controllers\Controller;
use App\Jobs\ScrapeItemMetadataJob;
use App\Models\Franchise;
use App\Models\Genre;
use App\Models\Item;
use App\Models\Platform;
use Illuminate\Database\Eloquent\Builder;
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
            // US-006 -- Platform/Genre/Series filters. Single-select per
            // dimension (the filter bar is tag buttons, not checkboxes).
            ->when(
                $request->integer('platform_id'),
                fn ($query, $platformId) => $query->where('platform_id', $platformId),
            )
            ->when(
                $request->integer('genre_id'),
                fn ($query, $genreId) => $query->whereHas(
                    'genres',
                    fn ($genres) => $genres->where('genres.id', $genreId),
                ),
            )
            ->when(
                $request->integer('franchise_id'),
                fn ($query, $franchiseId) => $query->whereHas(
                    'metadata',
                    fn ($metadata) => $metadata->where('franchise_id', $franchiseId),
                ),
            )
            // Mobile Table View (US-032/033) needs platform/genres/cover_url
            // and a compact wishlist_detail per row -- loaded here so the
            // list stays a single request instead of one per row. photos/
            // metadata are what Item::coverUrl() needs to resolve.
            ->with(['platform', 'collection', 'genres', 'photos', 'metadata', 'wishlistDetail'])
            ->tap(fn ($query) => $this->applySort($query, $request->string('sort', 'newest')->toString()))
            ->paginate($perPage);

        return response()->json($items);
    }

    /**
     * US-006a -- each filter dropdown only lists values actually present
     * among the current collection's items, not every value that exists
     * globally. Also drives the "disabled state" (empty array = grayed out).
     */
    public function filterOptions(Request $request)
    {
        $collectionId = $request->integer('collection_id');
        $scopeToCollection = fn ($query) => $query->when(
            $collectionId,
            fn ($q, $id) => $q->where('collection_id', $id),
        );

        $platforms = Platform::query()
            ->whereHas('items', $scopeToCollection)
            ->orderBy('name')
            ->get(['id', 'name', 'abbreviation']);

        $genres = Genre::query()
            ->whereHas('items', $scopeToCollection)
            ->orderBy('name')
            ->get(['id', 'name']);

        $franchises = Franchise::query()
            ->whereHas(
                'itemMetadata',
                fn ($metadata) => $metadata->whereHas('item', $scopeToCollection),
            )
            ->orderBy('name')
            ->get(['id', 'name']);

        return response()->json([
            'platforms' => $platforms,
            'genres' => $genres,
            'franchises' => $franchises,
        ]);
    }

    /**
     * US-009. "Newest/Oldest added first" sorts by acquired_date (when the
     * collector got the physical item), not created_at (when the DB row was
     * created) -- the adjacent spec rule about items with no date sorting
     * alphabetically after dated ones only makes sense against a nullable
     * date, and acquired_date is the nullable one (created_at never is).
     * Wishlist's desire-score/price sort options aren't implemented yet --
     * see docs/tz/BACKLOG.md, they need US-020/021's wishlist fields first.
     */
    private function applySort(Builder $query, string $sort): void
    {
        match ($sort) {
            'oldest' => $query->orderByRaw('acquired_date IS NULL')
                ->orderBy('acquired_date')
                ->orderBy('title'),
            'az' => $query->orderBy('title'),
            'za' => $query->orderByDesc('title'),
            default => $query->orderByRaw('acquired_date IS NULL')
                ->orderByDesc('acquired_date')
                ->orderBy('title'),
        };
    }

    public function show(Item $item)
    {
        $item->load([
            'platform',
            'collection',
            'metadata.franchise',
            'photos',
            'genres',
            // US-021 -- the gifter's name/avatar are needed for the
            // acquisition badge, so load one level deeper than before.
            'wishlistDetail.gifter',
        ]);

        if ($item->metadata) {
            $item->metadata->setAttribute('sequels', $this->enrichRelatedGames($item->metadata->sequels ?? []));
            $item->metadata->setAttribute('prequels', $this->enrichRelatedGames($item->metadata->prequels ?? []));
            $item->metadata->setAttribute('remakes', $this->enrichRelatedGames($item->metadata->remakes ?? []));
        }

        return response()->json($item);
    }

    /**
     * US-011 -- for each sequel/prequel/remake tag (raw {id, name} from
     * IGDB), attach whether that game is already owned or wishlisted
     * locally, plus enough info for the frontend to jump straight to it.
     * Batches into a single query instead of N+1-ing per tag.
     *
     * @param  array<int, array{id: int, name: string}>  $refs
     * @return array<int, array{id: int, name: string, status: string, item_id: ?int, collection_slug: ?string}>
     */
    private function enrichRelatedGames(array $refs): array
    {
        if (empty($refs)) {
            return [];
        }

        $matches = Item::query()
            ->whereIn('igdb_id', array_column($refs, 'id'))
            ->with('collection:id,slug,is_wishlist')
            ->get()
            ->keyBy('igdb_id');

        return array_map(function (array $ref) use ($matches) {
            $match = $matches->get($ref['id']);

            return [
                ...$ref,
                'status' => match (true) {
                    $match === null => 'unowned',
                    (bool) $match->collection?->is_wishlist => 'wishlisted',
                    default => 'owned',
                },
                'item_id' => $match?->id,
                'collection_slug' => $match?->collection?->slug,
            ];
        }, $refs);
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
