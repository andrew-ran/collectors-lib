<?php

use App\Models\AdminUser;
use App\Models\Collection;
use App\Models\Item;
use Laravel\Sanctum\Sanctum;

beforeEach(function () {
    Sanctum::actingAs(AdminUser::factory()->create(), ['*']);
});

test('creating a collection auto-slugs from the name, appending a suffix on collision', function () {
    Collection::factory()->create(['slug' => 'retro-shelf', 'name' => 'Retro Shelf']);

    $response = $this->postJson('/api/collections', ['name' => 'Retro Shelf']);

    $response->assertCreated()->assertJsonFragment(['slug' => 'retro-shelf-2']);
});

test('a second collision appends -3, not another -2', function () {
    Collection::factory()->create(['slug' => 'retro-shelf']);
    Collection::factory()->create(['slug' => 'retro-shelf-2']);

    $response = $this->postJson('/api/collections', ['name' => 'Retro Shelf']);

    $response->assertCreated()->assertJsonFragment(['slug' => 'retro-shelf-3']);
});

test('new collections are never default and sort after every existing one', function () {
    Collection::factory()->create(['sort_order' => 5]);

    $response = $this->postJson('/api/collections', ['name' => 'New Shelf']);

    $response->assertCreated()->assertJsonFragment(['is_default' => false, 'sort_order' => 6]);
});

test('renaming a default collection is rejected', function () {
    $collection = Collection::factory()->default()->create(['name' => 'My Collection']);

    $response = $this->putJson("/api/collections/{$collection->id}", [
        'name' => 'Something Else',
    ]);

    $response->assertUnprocessable();
    expect($collection->fresh()->name)->toBe('My Collection');
});

test('toggling is_wishlist on a default collection is still allowed', function () {
    $collection = Collection::factory()->default()->create(['name' => 'Wishlist', 'is_wishlist' => false]);

    $response = $this->putJson("/api/collections/{$collection->id}", [
        'name' => 'Wishlist',
        'is_wishlist' => true,
    ]);

    $response->assertOk();
    expect($collection->fresh()->is_wishlist)->toBeTrue();
});

test('renaming a non-default collection works and regenerates the slug', function () {
    $collection = Collection::factory()->create(['name' => 'Old Name', 'slug' => 'old-name']);

    $response = $this->putJson("/api/collections/{$collection->id}", ['name' => 'New Name']);

    $response->assertOk();
    expect($collection->fresh())->name->toBe('New Name')->slug->toBe('new-name');
});

test('deleting a default collection is rejected', function () {
    $collection = Collection::factory()->default()->create();

    $this->deleteJson("/api/collections/{$collection->id}")->assertUnprocessable();
    expect(Collection::find($collection->id))->not->toBeNull();
});

test('deleting a non-empty collection is rejected -- items.collection_id cascades on delete', function () {
    $collection = Collection::factory()->create();
    Item::factory()->create(['collection_id' => $collection->id]);

    $response = $this->deleteJson("/api/collections/{$collection->id}");

    $response->assertUnprocessable();
    expect(Collection::find($collection->id))->not->toBeNull();
});

test('deleting an empty non-default collection succeeds', function () {
    $collection = Collection::factory()->create();

    $this->deleteJson("/api/collections/{$collection->id}")->assertNoContent();

    expect(Collection::find($collection->id))->toBeNull();
});
