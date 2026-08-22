<?php

namespace App\Http\Controllers\Api;

use App\Enums\AcquiredDatePrecision;
use App\Enums\ItemType;
use App\Enums\ScrapeStatus;
use App\Http\Controllers\Controller;
use App\Jobs\ScrapeItemMetadataJob;
use App\Models\Company;
use App\Models\Franchise;
use App\Models\Genre;
use App\Models\Item;
use App\Models\ItemMetadata;
use App\Models\Platform;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
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
            // Admin item list (US-112 follow-up) -- title search, works
            // across every collection at once (collection_id stays optional
            // here, same as always; omitting it already meant "all
            // collections" before this).
            ->when(
                $request->filled('q'),
                fn ($query) => $query->where('title', 'like', '%'.$request->string('q')->toString().'%'),
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

    /**
     * US-121/122 -- a manual add (book/console/peripheral) can arrive with
     * its metadata already known up front -- either typed by hand, or
     * pre-filled client-side from an OpenLibrary ISBN lookup (US-121) that
     * the admin then confirmed/edited -- unlike a game add, which only ever
     * sends `igdb_id` and lets ScrapeItemMetadataJob fill item_metadata
     * asynchronously afterwards. So store() writes any metadata fields it
     * receives straight into item_metadata synchronously, in the same
     * request -- there's nothing to poll/wait for, since no external fetch
     * happens server-side in this path.
     */
    public function store(Request $request)
    {
        $validated = $this->validated($request);

        $metadataFields = ['description', 'author', 'publisher', 'release_year'];
        $metadataInput = array_intersect_key($validated, array_flip($metadataFields));
        $itemInput = array_diff_key($validated, array_flip($metadataFields));

        // Manually added items (no igdb_id) skip the scrape pipeline entirely.
        $itemInput['scrape_status'] = ! empty($itemInput['igdb_id'])
            ? ScrapeStatus::Pending->value
            : ScrapeStatus::Manual->value;

        $item = Item::create($itemInput);

        if (! empty($metadataInput)) {
            $item->metadata()->create($metadataInput);
        }

        // Ready to run as soon as IGDB credentials exist -- see IgdbService.
        if ($item->igdb_id) {
            ScrapeItemMetadataJob::dispatch($item->id);
        }

        return response()->json($item->load('metadata'), 201);
    }

    /**
     * US-112/114 -- the edit form resubmits the whole item on every save
     * (collection_id included, covering US-114's move-between-collections),
     * plus the optional metadata fields below. `title` lives on `items`
     * itself; its override flag is still tracked in the same
     * `manual_overrides` JSON blob as the metadata-table fields, since that
     * blob means "should a future re-scrape touch this", not "is this a
     * metadata-table column" -- see applyMetadataInput().
     */
    public function update(Request $request, Item $item)
    {
        $validated = $this->validated($request);

        $metadataFields = ['description', 'franchise_name', 'developer', 'publisher', 'genres'];
        $metadataInput = array_intersect_key($validated, array_flip($metadataFields));
        $itemInput = array_diff_key($validated, array_flip($metadataFields));

        // Resolved once and threaded through -- $item->metadata is a hasOne
        // relation that Eloquent caches on first access; calling
        // ?: $item->metadata()->make() more than once per request (e.g. once
        // for the title check, again inside a helper) can each build a
        // separate unsaved instance if the cache was still null the second
        // time, silently dropping whichever write doesn't win. One instance,
        // saved once at the end via the relation itself (correct either way,
        // new or existing row).
        $metadata = $item->metadata ?: $item->metadata()->make();

        if (array_key_exists('title', $itemInput) && $itemInput['title'] !== $item->title) {
            $metadata->manual_overrides = [...($metadata->manual_overrides ?? []), 'title' => true];
        }

        $item->update($itemInput);

        if (! empty($metadataInput)) {
            $this->applyMetadataInput($metadata, $item, $metadataInput);
        }

        // isDirty() alone (not "|| !exists") -- a fresh make()'d instance
        // that nothing actually set stays clean, so a save with no metadata
        // fields touched doesn't insert a pointless all-null row.
        if ($metadata->isDirty()) {
            $item->metadata()->save($metadata);
        }

        $item->load(['platform', 'collection', 'metadata.franchise', 'genres']);

        return response()->json($item);
    }

    /**
     * US-113 -- re-fetch from IGDB. Fields the admin has manually edited are
     * left alone by ScrapeItemMetadataJob itself (it reads manual_overrides
     * before touching anything) -- this endpoint just triggers it and gives
     * the admin form immediate "Scraping..." feedback instead of waiting for
     * the queue worker to pick the job up.
     */
    public function rescrape(Item $item)
    {
        if (! $item->igdb_id) {
            return response()->json(
                ['message' => 'This item has no igdb_id -- nothing to re-scrape (it was added manually).'],
                422,
            );
        }

        $item->update(['scrape_status' => ScrapeStatus::Pending]);
        ScrapeItemMetadataJob::dispatch($item->id);

        $item->load(['platform', 'collection', 'metadata.franchise', 'genres']);

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
            // US-121 -- an OpenLibrary-derived (or hand-typed) cover; a plain
            // `items` column already, same as IGDB's (see Item::$fillable) --
            // no book-specific column needed.
            'cover_image_url' => ['sometimes', 'nullable', 'string', 'max:1000'],

            // US-112 -- edit-form-only fields, absent from store()'s manual
            // add flow. 'sometimes' so omitting a field entirely (e.g. a
            // future partial-update caller) leaves it untouched, as opposed
            // to 'nullable' alone, which would still require the key to be
            // present (as null) in the payload.
            'description' => ['sometimes', 'nullable', 'string'],
            'franchise_name' => ['sometimes', 'nullable', 'string', 'max:500'],
            'developer' => ['sometimes', 'nullable', 'string', 'max:500'],
            'publisher' => ['sometimes', 'nullable', 'string', 'max:500'],
            'genres' => ['sometimes', 'array'],
            'genres.*' => ['string', 'max:255'],

            // US-121 -- book-only metadata fields, only ever sent by the
            // "add book" flow (store() only, not yet part of the edit form --
            // see docs/tz/TECH_DEBT.md).
            'author' => ['sometimes', 'nullable', 'string', 'max:500'],
            'release_year' => ['sometimes', 'nullable', 'integer', 'min:0', 'max:9999'],
        ]);
    }

    /**
     * US-112 -- applies edit-form metadata fields onto the (already
     * resolved, not-yet-saved) $metadata instance and records which ones
     * actually *changed* (not merely "were present in the request") as
     * manually overridden, so a later re-scrape (US-113) leaves them alone.
     * Diffing against the current value -- rather than flagging anything
     * the form resubmits -- matters because the edit form always resends
     * the full set of fields on every save (e.g. saving a title change
     * shouldn't also lock in the untouched description); see
     * docs/tz/TECH_DEBT.md for the reasoning if this needs revisiting.
     * Doesn't save $metadata itself -- update() does that once, after this
     * (and the title check) have both had a chance to dirty it.
     */
    private function applyMetadataInput(ItemMetadata $metadata, Item $item, array $input): void
    {
        if (array_key_exists('description', $input) && $input['description'] !== $metadata->description) {
            $metadata->description = $input['description'];
            $metadata->manual_overrides = [...($metadata->manual_overrides ?? []), 'description' => true];
        }

        if (array_key_exists('franchise_name', $input)) {
            $franchiseId = $input['franchise_name']
                ? Franchise::firstOrCreate(
                    ['slug' => Str::slug($input['franchise_name'])],
                    ['name' => $input['franchise_name']],
                )->id
                : null;

            if ($franchiseId !== $metadata->franchise_id) {
                $metadata->franchise_id = $franchiseId;
                $metadata->manual_overrides = [...($metadata->manual_overrides ?? []), 'franchise_id' => true];
            }
        }

        if (array_key_exists('developer', $input) && $input['developer'] !== $metadata->developer) {
            $metadata->developer = $input['developer'];
            $metadata->manual_overrides = [...($metadata->manual_overrides ?? []), 'developer' => true];
            $this->rememberCompany($input['developer']);
        }

        if (array_key_exists('publisher', $input) && $input['publisher'] !== $metadata->publisher) {
            $metadata->publisher = $input['publisher'];
            $metadata->manual_overrides = [...($metadata->manual_overrides ?? []), 'publisher' => true];
            $this->rememberCompany($input['publisher']);
        }

        if (array_key_exists('genres', $input)) {
            $newGenreIds = $this->matchGenresByName($input['genres']);
            $currentGenreIds = $item->genres()->pluck('genres.id')->all();
            sort($newGenreIds);
            sort($currentGenreIds);

            if ($newGenreIds !== $currentGenreIds) {
                $item->genres()->sync($newGenreIds);
                $metadata->manual_overrides = [...($metadata->manual_overrides ?? []), 'genres' => true];
            }
        }
    }

    private function rememberCompany(?string $name): void
    {
        if (! $name) {
            return;
        }

        // Grows the autocomplete dictionary as the admin types new names --
        // same idea as ScrapeItemMetadataJob::matchCompanies(), just keyed
        // by name here since there's no igdb_id for a manually-typed one.
        Company::firstOrCreate(['name' => $name]);
    }

    /**
     * @param  array<int, string>  $names
     * @return array<int, int>
     */
    private function matchGenresByName(array $names): array
    {
        return collect($names)
            ->map(fn (string $name) => Genre::firstOrCreate(
                ['slug' => Str::slug($name)],
                ['name' => $name],
            )->id)
            ->all();
    }
}
