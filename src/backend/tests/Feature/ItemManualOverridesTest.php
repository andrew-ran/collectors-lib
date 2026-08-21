<?php

use App\Models\AdminUser;
use App\Models\Item;
use Laravel\Sanctum\Sanctum;

/**
 * US-112 -- the edit form always resubmits every metadata field on every
 * save (not a partial patch), so ItemController::applyMetadataInput() must
 * diff each field against its current stored value to decide whether it was
 * actually manually overridden -- flagging on "field present in the
 * request" alone would lock in every untouched field the moment the admin
 * changes anything at all. See docs/tz/TECH_DEBT.md for the full reasoning.
 */
beforeEach(function () {
    Sanctum::actingAs(AdminUser::factory()->create(), ['*']);
});

function baseItemPayload(Item $item, array $overrides = []): array
{
    return array_merge([
        'collection_id' => $item->collection_id,
        'type' => $item->type->value,
        'igdb_id' => $item->igdb_id,
        'custom_identifier' => $item->custom_identifier,
        'title' => $item->title,
        'subtitle' => $item->subtitle,
        'platform_id' => $item->platform_id,
        'acquired_date' => null,
        'acquired_date_precision' => null,
        'purchase_price' => null,
        'notes' => null,
        'description' => null,
        'franchise_name' => null,
        'developer' => null,
        'publisher' => null,
        'genres' => [],
    ], $overrides);
}

test('resubmitting the same description does not flag it as manually overridden', function () {
    $item = Item::factory()->create();
    $item->metadata()->create(['description' => 'Original description']);

    $this->putJson("/api/items/{$item->id}", baseItemPayload($item, [
        'description' => 'Original description',
    ]))->assertOk();

    expect($item->metadata->fresh()->manual_overrides['description'] ?? false)->toBeFalse();
});

test('submitting a different description flags it as manually overridden', function () {
    $item = Item::factory()->create();
    $item->metadata()->create(['description' => 'Original description']);

    $this->putJson("/api/items/{$item->id}", baseItemPayload($item, [
        'description' => 'A brand new description',
    ]))->assertOk();

    expect($item->metadata->fresh()->manual_overrides['description'] ?? false)->toBeTrue();
});

test('changing only the title does not also flag the untouched description', function () {
    $item = Item::factory()->create(['title' => 'Old Title']);
    $item->metadata()->create(['description' => 'Untouched description']);

    $this->putJson("/api/items/{$item->id}", baseItemPayload($item, [
        'title' => 'New Title',
        'description' => 'Untouched description',
    ]))->assertOk();

    $overrides = $item->metadata->fresh()->manual_overrides ?? [];
    expect($overrides['title'] ?? false)->toBeTrue();
    expect($overrides['description'] ?? false)->toBeFalse();
});

test('developer and publisher are diffed independently of each other', function () {
    $item = Item::factory()->create();
    $item->metadata()->create(['developer' => 'Original Dev', 'publisher' => 'Original Pub']);

    $this->putJson("/api/items/{$item->id}", baseItemPayload($item, [
        'developer' => 'A New Developer',
        'publisher' => 'Original Pub',
    ]))->assertOk();

    $overrides = $item->metadata->fresh()->manual_overrides ?? [];
    expect($overrides['developer'] ?? false)->toBeTrue();
    expect($overrides['publisher'] ?? false)->toBeFalse();
});
