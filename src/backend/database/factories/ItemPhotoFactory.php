<?php

namespace Database\Factories;

use App\Models\Item;
use App\Models\ItemPhoto;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

/**
 * @extends Factory<ItemPhoto>
 */
class ItemPhotoFactory extends Factory
{
    protected $model = ItemPhoto::class;

    public function definition(): array
    {
        return [
            'item_id' => Item::factory(),
            'file_path' => 'items/test/'.Str::uuid()->toString().'.webp',
            'sort_order' => 0,
            'is_primary' => false,
        ];
    }
}
