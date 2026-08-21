<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Item;
use App\Models\ItemPhoto;
use App\Services\ImageService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Symfony\Component\HttpFoundation\Response;

/**
 * US-117/118/119/120 -- admin-uploaded photos of the physical item, on top
 * of (never replacing) the IGDB cover -- see DATABASE_SCHEMA.md's
 * item_photos notes and Item::coverUrl()'s resolution order. All routes are
 * admin-only, wired under auth:sanctum in routes/api.php.
 *
 * The IGDB cover itself has no `ItemPhoto` row -- it's a separate "base
 * tile" the frontend renders from `Item::igdb_cover_url` (see that
 * accessor), not deletable and only ever "overridden" by an actual uploaded
 * photo being marked primary (see setPrimary()). Nothing here touches
 * `cover_image_path`/`cover_image_url`.
 */
class ItemPhotoController extends Controller
{
    /** Same cap as IGDB covers, per REQUIREMENTS.md TZ Q6. */
    private const PHOTO_MAX_DIMENSION = 1600;

    private const PHOTO_WEBP_QUALITY = 85;

    /** REQUIREMENTS.md's upload-validation note: real MIME type + a max
     * file size, on top of the WebP re-encode itself stripping anything
     * hidden in the file that isn't actual image data. */
    private const MAX_UPLOAD_KB = 10240;

    public function __construct(private readonly ImageService $imageService) {}

    /** US-117 -- multi-file upload (dropzone supports drag-and-drop or
     * multi-select on the frontend; this endpoint just accepts however many
     * files arrive in one request). New photos are always appended after
     * the current highest sort_order and never auto-marked primary -- US-119
     * is a separate, explicit action. */
    public function store(Request $request, Item $item)
    {
        $request->validate([
            'photos' => ['required', 'array', 'min:1'],
            'photos.*' => ['file', 'image', 'mimes:jpeg,png,webp,gif', 'max:'.self::MAX_UPLOAD_KB],
        ]);

        $nextSortOrder = (int) $item->photos()->max('sort_order') + 1;

        $photos = collect($request->file('photos'))->map(function ($file) use ($item, &$nextSortOrder) {
            $path = $this->imageService->store(
                $file,
                "items/{$item->id}",
                self::PHOTO_MAX_DIMENSION,
                self::PHOTO_WEBP_QUALITY,
            );

            return $item->photos()->create([
                'file_path' => $path,
                'sort_order' => $nextSortOrder++,
                'is_primary' => false,
            ]);
        });

        return response()->json($photos->values(), 201);
    }

    /**
     * US-118 -- drag-to-reorder. Accepts the full ordered list of this
     * item's photo ids; anything not belonging to $item is rejected up
     * front (422) rather than silently ignored, since a partial/foreign id
     * list almost certainly means the frontend's local state and the
     * server have drifted.
     */
    public function reorder(Request $request, Item $item)
    {
        $validated = $request->validate([
            'photo_ids' => ['required', 'array'],
            'photo_ids.*' => ['integer'],
        ]);

        $ownedIds = $item->photos()->pluck('id')->all();
        sort($ownedIds);
        $submittedIds = $validated['photo_ids'];
        sort($submittedIds);

        if ($ownedIds !== $submittedIds) {
            return response()->json(
                ['message' => 'photo_ids must be exactly this item\'s current photo ids.'],
                422,
            );
        }

        foreach ($validated['photo_ids'] as $index => $photoId) {
            ItemPhoto::whereKey($photoId)->update(['sort_order' => $index]);
        }

        return response()->json($item->photos()->get());
    }

    /** US-119 -- mark one photo primary, unsetting any other primary photo
     * on this item first (at most one row per item may have is_primary =
     * true, enforced here -- see DATABASE_SCHEMA.md). Marking a photo
     * primary is how an uploaded photo "overrides" the IGDB cover tile on
     * the frontend; there's no separate "unset primary" action -- deleting
     * the primary photo (destroy(), below) is what reverts to the cover. */
    public function setPrimary(Item $item, ItemPhoto $photo)
    {
        $this->ensureBelongsToItem($item, $photo);

        $item->photos()->where('id', '!=', $photo->id)->update(['is_primary' => false]);
        $photo->update(['is_primary' => true]);

        return response()->json($item->photos()->get());
    }

    /** US-120 -- delete an uploaded photo. If it was the primary photo, no
     * special-case handling is needed to "revert to the IGDB cover" --
     * Item::coverUrl()'s resolution order already falls back to the cover
     * the moment no item_photos row has is_primary = true. */
    public function destroy(Item $item, ItemPhoto $photo)
    {
        $this->ensureBelongsToItem($item, $photo);

        Storage::disk('public')->delete($photo->file_path);
        $photo->delete();

        return response()->noContent();
    }

    private function ensureBelongsToItem(Item $item, ItemPhoto $photo): void
    {
        if ($photo->item_id !== $item->id) {
            abort(Response::HTTP_NOT_FOUND);
        }
    }
}
