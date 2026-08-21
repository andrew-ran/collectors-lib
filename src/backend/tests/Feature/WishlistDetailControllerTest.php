<?php

use App\Models\AdminUser;
use App\Models\Collection;
use App\Models\Gifter;
use App\Models\Item;
use Laravel\Sanctum\Sanctum;

beforeEach(function () {
    Sanctum::actingAs(AdminUser::factory()->create(), ['*']);
});

test('US-150 saves wishlist fields independently of the item itself', function () {
    $item = Item::factory()->create();

    $response = $this->putJson("/api/items/{$item->id}/wishlist-detail", [
        'condition_preference' => 'used_ok',
        'edition_note' => 'PAL box, no manual',
        'price_new_estimate' => '49.99',
        'price_used_estimate' => '19.99',
        'desire_score' => 80,
    ]);

    $response->assertOk();
    $detail = $item->wishlistDetail()->first();
    expect($detail->condition_preference->value)->toBe('used_ok');
    expect($detail->desire_score)->toBe(80);
    expect($detail->priority->value)->toBe('high');
});

test('marking received with a registered gifter copies price_paid and moves the collection', function () {
    $wishlistCollection = Collection::factory()->wishlist()->create();
    $myCollection = Collection::factory()->create();
    $item = Item::factory()->create(['collection_id' => $wishlistCollection->id]);
    $gifter = Gifter::factory()->create();

    $response = $this->postJson("/api/items/{$item->id}/mark-received", [
        'acquisition_type' => 'gifted',
        'gifter_id' => $gifter->id,
        'thank_you_note' => 'Thanks!',
        'price_paid' => '59.90',
        'received_at' => '2026-08-20',
        'collection_id' => $myCollection->id,
    ]);

    $response->assertOk();

    $item->refresh();
    expect((string) $item->purchase_price)->toBe('59.90');
    expect($item->collection_id)->toBe($myCollection->id);

    $detail = $item->wishlistDetail()->first();
    expect($detail->received)->toBeTrue();
    expect($detail->gifter_id)->toBe($gifter->id);
    expect($detail->gifter_name_override)->toBeNull();
});

test('gifter_id wins over gifter_name_override when both are sent', function () {
    $wishlistCollection = Collection::factory()->wishlist()->create();
    $myCollection = Collection::factory()->create();
    $item = Item::factory()->create(['collection_id' => $wishlistCollection->id]);
    $gifter = Gifter::factory()->create();

    $this->postJson("/api/items/{$item->id}/mark-received", [
        'acquisition_type' => 'gifted',
        'gifter_id' => $gifter->id,
        'gifter_name_override' => 'Some One-Off Name',
        'collection_id' => $myCollection->id,
    ])->assertOk();

    $detail = $item->wishlistDetail()->first();
    expect($detail->gifter_id)->toBe($gifter->id);
    expect($detail->gifter_name_override)->toBeNull();
});

test('a one-off gifter name is saved when no gifter_id is sent', function () {
    $wishlistCollection = Collection::factory()->wishlist()->create();
    $myCollection = Collection::factory()->create();
    $item = Item::factory()->create(['collection_id' => $wishlistCollection->id]);

    $this->postJson("/api/items/{$item->id}/mark-received", [
        'acquisition_type' => 'gifted',
        'gifter_name_override' => 'Grandma',
        'collection_id' => $myCollection->id,
    ])->assertOk();

    $detail = $item->wishlistDetail()->first();
    expect($detail->gifter_id)->toBeNull();
    expect($detail->gifter_name_override)->toBe('Grandma');
});

test('self-purchased clears gifted-only fields even if they were sent', function () {
    $wishlistCollection = Collection::factory()->wishlist()->create();
    $myCollection = Collection::factory()->create();
    $item = Item::factory()->create(['collection_id' => $wishlistCollection->id]);
    $gifter = Gifter::factory()->create();

    $this->postJson("/api/items/{$item->id}/mark-received", [
        'acquisition_type' => 'self_purchased',
        'gifter_id' => $gifter->id,
        'gifter_name_override' => 'Should Be Ignored',
        'thank_you_note' => 'Should Be Ignored Too',
        'price_paid' => '29.99',
        'collection_id' => $myCollection->id,
    ])->assertOk();

    $detail = $item->wishlistDetail()->first();
    expect($detail->acquisition_type->value)->toBe('self_purchased');
    expect($detail->gifter_id)->toBeNull();
    expect($detail->gifter_name_override)->toBeNull();
    expect($detail->thank_you_note)->toBeNull();
    expect((string) $item->fresh()->purchase_price)->toBe('29.99');
});
