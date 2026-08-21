<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Collection;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

/**
 * index() is public (read-only), like the rest of GET /api/* -- see
 * ARCHITECTURE.md Authentication. Used by the public SPA's collection
 * switcher (US-001b) and the admin "add item" collection picker (US-110).
 * store()/update()/destroy() (US-130/131/132/133) are admin-only, wired
 * under auth:sanctum in routes/api.php.
 */
class CollectionController extends Controller
{
    public function index()
    {
        return response()->json(
            Collection::query()->orderBy('sort_order')->get(),
        );
    }

    /** US-130 -- new collections are never default and always start after
     * every existing one in display order. */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'description' => ['nullable', 'string'],
            'is_wishlist' => ['sometimes', 'boolean'],
        ]);

        $collection = Collection::create([
            ...$validated,
            'slug' => $this->uniqueSlug($validated['name']),
            'is_default' => false,
            'sort_order' => (int) Collection::max('sort_order') + 1,
        ]);

        return response()->json($collection, 201);
    }

    /**
     * US-131 -- any collection can have its wishlist-type flag toggled.
     * US-133 -- name is rejected if it would actually change on a default
     * collection ("My Collection"/"Wishlist"); description/is_wishlist stay
     * editable on defaults too, only the name (and, by extension, the slug
     * derived from it) is locked.
     */
    public function update(Request $request, Collection $collection)
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'description' => ['nullable', 'string'],
            'is_wishlist' => ['sometimes', 'boolean'],
        ]);

        if ($collection->is_default && $validated['name'] !== $collection->name) {
            return response()->json(
                ['message' => 'Default collections cannot be renamed.'],
                422,
            );
        }

        if ($validated['name'] !== $collection->name) {
            $validated['slug'] = $this->uniqueSlug($validated['name'], ignoreId: $collection->id);
        }

        $collection->update($validated);

        return response()->json($collection);
    }

    /**
     * US-132 -- default collections ("My Collection"/"Wishlist") can't be
     * deleted.
     *
     * Also blocks deleting a non-empty custom collection -- `items.
     * collection_id` is `cascadeOnDelete()` (see the `items` migration), so
     * without this check, deleting a collection here would silently delete
     * every item in it too. That's a real footgun for a "Delete" button,
     * not a hypothetical one, so it's guarded rather than left for later.
     */
    public function destroy(Collection $collection)
    {
        if ($collection->is_default) {
            return response()->json(
                ['message' => 'Default collections cannot be deleted.'],
                422,
            );
        }

        if ($collection->items()->exists()) {
            return response()->json(
                ['message' => 'Move or delete every item in this collection before deleting it.'],
                422,
            );
        }

        $collection->delete();

        return response()->noContent();
    }

    private function uniqueSlug(string $name, ?int $ignoreId = null): string
    {
        $base = Str::slug($name);
        $slug = $base;
        $suffix = 2;

        while (
            Collection::query()
                ->where('slug', $slug)
                ->when($ignoreId, fn ($query, $id) => $query->whereNot('id', $id))
                ->exists()
        ) {
            $slug = "{$base}-{$suffix}";
            $suffix++;
        }

        return $slug;
    }
}
