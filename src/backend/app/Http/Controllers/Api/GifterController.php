<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Gifter;
use App\Services\ImageService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

/**
 * US-160/161 -- gifter profile CRUD, admin-only (all routes wired under
 * auth:sanctum in routes/api.php; there's no public gifter listing endpoint
 * -- gifter name/avatar are only ever exposed publicly via an item's
 * wishlist_detail.gifter relation, see WishlistDetail/Item::show()).
 *
 * Avatar upload/resize/WebP-conversion is shared with ItemPhotoController
 * (US-117) via ImageService -- see that class's docblock.
 */
class GifterController extends Controller
{
    /** Small avatar thumbnail -- deliberately much smaller than the 1600px
     * cap used for full item photos (see DATABASE_SCHEMA.md item_photos). */
    private const AVATAR_MAX_DIMENSION = 400;

    private const AVATAR_WEBP_QUALITY = 85;

    public function __construct(private readonly ImageService $imageService) {}

    public function index()
    {
        return response()->json(
            Gifter::query()->orderBy('name')->get(),
        );
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'avatar' => ['sometimes', 'file', 'image', 'mimes:jpeg,png,webp,gif', 'max:5120'],
        ]);

        $avatarPath = $request->hasFile('avatar')
            ? $this->imageService->store(
                $request->file('avatar'),
                'gifters',
                self::AVATAR_MAX_DIMENSION,
                self::AVATAR_WEBP_QUALITY,
            )
            : null;

        $gifter = Gifter::create([
            'name' => $validated['name'],
            'avatar_path' => $avatarPath,
        ]);

        return response()->json($gifter, 201);
    }

    /** US-161 -- edit. A new `avatar` file replaces (and deletes) the old
     * one; omitting it keeps the existing avatar as-is -- there's no
     * separate "remove avatar" action since a gifter with no avatar just
     * falls back to a placeholder client-side. */
    public function update(Request $request, Gifter $gifter)
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'avatar' => ['sometimes', 'file', 'image', 'mimes:jpeg,png,webp,gif', 'max:5120'],
        ]);

        if ($request->hasFile('avatar')) {
            $oldAvatarPath = $gifter->avatar_path;
            $validated['avatar_path'] = $this->imageService->store(
                $request->file('avatar'),
                'gifters',
                self::AVATAR_MAX_DIMENSION,
                self::AVATAR_WEBP_QUALITY,
            );

            if ($oldAvatarPath) {
                Storage::disk('public')->delete($oldAvatarPath);
            }
        }

        unset($validated['avatar']);
        $gifter->update($validated);

        return response()->json($gifter);
    }

    /** US-161 -- delete. `wishlist_details.gifter_id` is `nullOnDelete()`
     * (see the wishlist_details migration), so deleting a gifter that's
     * already used on past acquisitions is safe -- those rows just lose the
     * gifter link (falling back to whatever `gifter_name_override` holds, if
     * anything), they aren't deleted themselves. No guard needed here,
     * unlike CollectionController::destroy()'s cascadeOnDelete() case. */
    public function destroy(Gifter $gifter)
    {
        if ($gifter->avatar_path) {
            Storage::disk('public')->delete($gifter->avatar_path);
        }

        $gifter->delete();

        return response()->noContent();
    }
}
