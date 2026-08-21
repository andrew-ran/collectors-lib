<?php

namespace Database\Factories;

use App\Enums\ItemType;
use App\Models\Collection;
use App\Models\Item;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Item>
 */
class ItemFactory extends Factory
{
    protected $model = Item::class;

    public function definition(): array
    {
        return [
            'collection_id' => Collection::factory(),
            'type' => ItemType::Game->value,
            'igdb_id' => null,
            'title' => fake()->words(3, true),
            'scrape_status' => 'manual',
        ];
    }
}
