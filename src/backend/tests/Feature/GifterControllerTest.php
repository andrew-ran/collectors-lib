<?php

use App\Models\AdminUser;
use App\Models\Gifter;
use App\Models\Item;
use App\Models\WishlistDetail;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Laravel\Sanctum\Sanctum;

beforeEach(function () {
    Sanctum::actingAs(AdminUser::factory()->create(), ['*']);
});

test('creating a gifter without an avatar works', function () {
    $response = $this->postJson('/api/gifters', ['name' => 'Mom']);

    $response->assertCreated()->assertJsonFragment(['name' => 'Mom', 'avatar_url' => null]);
});

test('uploading an avatar runs it through ImageService and stores a resolvable webp URL', function () {
    Storage::fake('public');

    $response = $this->post('/api/gifters', [
        'name' => 'Dad',
        'avatar' => UploadedFile::fake()->image('avatar.jpg', 800, 800),
    ]);

    $response->assertCreated();

    $gifter = Gifter::firstWhere('name', 'Dad');
    expect($gifter->avatar_path)->toEndWith('.webp');
    expect($response->json('avatar_url'))->toContain($gifter->avatar_path);
    Storage::disk('public')->assertExists($gifter->avatar_path);
});

test('replacing an avatar deletes the old file', function () {
    Storage::fake('public');
    Storage::disk('public')->put('gifters/old.webp', 'old-bytes');
    $gifter = Gifter::factory()->create(['avatar_path' => 'gifters/old.webp']);

    $response = $this->post("/api/gifters/{$gifter->id}", [
        '_method' => 'PUT',
        'name' => $gifter->name,
        'avatar' => UploadedFile::fake()->image('new.jpg', 200, 200),
    ]);

    $response->assertOk();
    Storage::disk('public')->assertMissing('gifters/old.webp');
    expect($gifter->fresh()->avatar_path)->not->toBe('gifters/old.webp');
});

test('renaming a gifter without touching the avatar keeps it as-is', function () {
    Storage::fake('public');
    $gifter = Gifter::factory()->create(['avatar_path' => 'gifters/keep-me.webp']);

    $response = $this->post("/api/gifters/{$gifter->id}", [
        '_method' => 'PUT',
        'name' => 'New Name',
    ]);

    $response->assertOk();
    expect($gifter->fresh())->name->toBe('New Name')->avatar_path->toBe('gifters/keep-me.webp');
});

test('deleting a gifter used by a past acquisition is unguarded -- the reference just goes null', function () {
    $gifter = Gifter::factory()->create();
    $item = Item::factory()->create();
    $detail = WishlistDetail::create([
        'item_id' => $item->id,
        'received' => true,
        'acquisition_type' => 'gifted',
        'gifter_id' => $gifter->id,
    ]);

    $this->deleteJson("/api/gifters/{$gifter->id}")->assertNoContent();

    expect(Gifter::find($gifter->id))->toBeNull();
    expect($detail->fresh())->not->toBeNull();
    expect($detail->fresh()->gifter_id)->toBeNull();
});
