<?php

namespace App\Http\Controllers\Api;

use App\Enums\AcquisitionType;
use App\Enums\ConditionPreference;
use App\Http\Controllers\Controller;
use App\Models\Item;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

/**
 * US-150/151 -- wishlist-only admin fields and the "mark as received" flow.
 * Admin-only, wired under auth:sanctum in routes/api.php. Both actions
 * resolve `$item->wishlistDetail` once and save it once, same "one instance,
 * one save" pattern as ItemController::update()'s metadata handling -- see
 * that method's docblock for why that matters (Eloquent's hasOne relation
 * caches on first access, so calling `?: $item->wishlistDetail()->make()`
 * more than once per request risks two divergent unsaved instances).
 */
class WishlistDetailController extends Controller
{
    /**
     * US-150 -- condition preference, edition note, price estimates, desire
     * score. Deliberately separate from ItemController::update() (the main
     * edit form): these fields only make sense while an item is still in a
     * wishlist-type collection, and saving them shouldn't be coupled to
     * saving the item's title/genres/etc.
     */
    public function update(Request $request, Item $item)
    {
        $validated = $request->validate([
            'condition_preference' => ['nullable', Rule::enum(ConditionPreference::class)],
            'edition_note' => ['nullable', 'string'],
            'price_new_estimate' => ['nullable', 'numeric', 'min:0'],
            'price_used_estimate' => ['nullable', 'numeric', 'min:0'],
            'desire_score' => ['nullable', 'integer', 'min:0', 'max:100'],
        ]);

        $detail = $item->wishlistDetail ?: $item->wishlistDetail()->make();
        $detail->fill($validated);
        $item->wishlistDetail()->save($detail);

        $item->load('wishlistDetail.gifter');

        return response()->json($item);
    }

    /**
     * US-151 -- mark a wishlist item received. Moves it into a regular
     * collection using the same mechanism as US-114 (just setting
     * collection_id) and copies price_paid onto items.purchase_price at the
     * same time it's set, per REQUIREMENTS.md -- purchase_price is kept
     * independent of whichever collection the item ends up in.
     *
     * `gifter_id` and `gifter_name_override` are mutually exclusive (US-163
     * -- pick a registered gifter, type a one-off name, or leave both blank)
     * and both are ignored/cleared for a self-purchase, even if the request
     * happened to include them -- acquisition_type is what actually decides
     * which of the gifted-only fields get saved, not merely which ones were
     * present in the payload.
     */
    public function markReceived(Request $request, Item $item)
    {
        $validated = $request->validate([
            'acquisition_type' => ['required', Rule::enum(AcquisitionType::class)],
            'gifter_id' => ['nullable', 'exists:gifters,id'],
            'gifter_name_override' => ['nullable', 'string', 'max:255'],
            'thank_you_note' => ['nullable', 'string'],
            'price_paid' => ['nullable', 'numeric', 'min:0'],
            'received_at' => ['nullable', 'date'],
            'collection_id' => ['required', 'exists:collections,id'],
        ]);

        $isGifted = $validated['acquisition_type'] === AcquisitionType::Gifted->value;

        $detail = $item->wishlistDetail ?: $item->wishlistDetail()->make();
        $detail->fill([
            'received' => true,
            'received_at' => $validated['received_at'] ?? now()->toDateString(),
            'acquisition_type' => $validated['acquisition_type'],
            'price_paid' => $validated['price_paid'] ?? null,
            'gifter_id' => $isGifted ? ($validated['gifter_id'] ?? null) : null,
            // A gifter_id and a one-off name are mutually exclusive -- prefer
            // the registered gifter if somehow both were sent.
            'gifter_name_override' => $isGifted && empty($validated['gifter_id'])
                ? ($validated['gifter_name_override'] ?? null)
                : null,
            'thank_you_note' => $isGifted ? ($validated['thank_you_note'] ?? null) : null,
        ]);
        $item->wishlistDetail()->save($detail);

        $item->update([
            'collection_id' => $validated['collection_id'],
            'purchase_price' => $validated['price_paid'] ?? null,
        ]);

        $item->load(['platform', 'collection', 'wishlistDetail.gifter']);

        return response()->json($item);
    }
}
