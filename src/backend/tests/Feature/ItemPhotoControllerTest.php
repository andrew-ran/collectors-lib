<?php

use App\Models\AdminUser;
use App\Models\Item;
use App\Models\ItemPhoto;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Laravel\Sanctum\Sanctum;

beforeEach(function () {
    Sanctum::actingAs(AdminUser::factory()->create(), ['*']);
});

test('uploading multiple photos converts each to webp and appends after the current max sort_order', function () {
    Storage::fake('public');
    $item = Item::factory()->create();
    ItemPhoto::factory()->create(['item_id' => $item->id, 'sort_order' => 3]);

    $response = $this->post("/api/items/{$item->id}/photos", [
        'photos' => [
            UploadedFile::fake()->image('one.jpg', 200, 200),
            UploadedFile::fake()->image('two.jpg', 200, 200),
        ],
    ]);

    $response->assertCreated();
    $created = $item->photos()->orderBy('sort_order')->get();
    expect($created)->toHaveCount(3);
    expect($created->pluck('sort_order')->all())->toBe([3, 4, 5]);
    expect($created->last()->is_primary)->toBeFalse();
});

test('uploading a non-image file is rejected', function () {
    $item = Item::factory()->create();

    $response = $this->post("/api/items/{$item->id}/photos", [
        'photos' => [UploadedFile::fake()->create('not-an-image.txt', 10)],
    ]);

    $response->assertUnprocessable();
});

test('reorder rejects a photo_ids list that does not exactly match the item\'s current photos', function () {
    $item = Item::factory()->create();
    $photo = ItemPhoto::factory()->create(['item_id' => $item->id]);
    $foreignPhoto = ItemPhoto::factory()->create();

    $response = $this->putJson("/api/items/{$item->id}/photos/reorder", [
        'photo_ids' => [$photo->id, $foreignPhoto->id],
    ]);

    $response->assertUnprocessable();
});

test('reorder applies the submitted order as sort_order', function () {
    $item = Item::factory()->create();
    $first = ItemPhoto::factory()->create(['item_id' => $item->id, 'sort_order' => 0]);
    $second = ItemPhoto::factory()->create(['item_id' => $item->id, 'sort_order' => 1]);

    $this->putJson("/api/items/{$item->id}/photos/reorder", [
        'photo_ids' => [$second->id, $first->id],
    ])->assertOk();

    expect($second->fresh()->sort_order)->toBe(0);
    expect($first->fresh()->sort_order)->toBe(1);
});

test('setPrimary unsets any other primary photo on the same item first', function () {
    $item = Item::factory()->create();
    $currentPrimary = ItemPhoto::factory()->create(['item_id' => $item->id, 'is_primary' => true]);
    $newPrimary = ItemPhoto::factory()->create(['item_id' => $item->id, 'is_primary' => false]);

    $this->putJson("/api/items/{$item->id}/photos/{$newPrimary->id}/primary")->assertOk();

    expect($currentPrimary->fresh()->is_primary)->toBeFalse();
    expect($newPrimary->fresh()->is_primary)->toBeTrue();
});

test('setPrimary on a photo belonging to a different item is rejected', function () {
    $item = Item::factory()->create();
    $otherItemsPhoto = ItemPhoto::factory()->create();

    $this->putJson("/api/items/{$item->id}/photos/{$otherItemsPhoto->id}/primary")->assertNotFound();
});

test('deleting a photo belonging to a different item is rejected', function () {
    $item = Item::factory()->create();
    $otherItemsPhoto = ItemPhoto::factory()->create();

    $this->deleteJson("/api/items/{$item->id}/photos/{$otherItemsPhoto->id}")->assertNotFound();

    expect(ItemPhoto::find($otherItemsPhoto->id))->not->toBeNull();
});

test('deleting a photo removes both the row and the stored file', function () {
    Storage::fake('public');
    $item = Item::factory()->create();
    Storage::disk('public')->put('items/1/photo.webp', 'bytes');
    $photo = ItemPhoto::factory()->create(['item_id' => $item->id, 'file_path' => 'items/1/photo.webp']);

    $this->deleteJson("/api/items/{$item->id}/photos/{$photo->id}")->assertNoContent();

    expect(ItemPhoto::find($photo->id))->toBeNull();
    Storage::disk('public')->assertMissing('items/1/photo.webp');
});
