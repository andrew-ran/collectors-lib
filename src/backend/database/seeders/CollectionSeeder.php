<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class CollectionSeeder extends Seeder
{
    /**
     * Seed the two default collections. Both are protected from deletion
     * in the app layer (see REQUIREMENTS.md US-132).
     */
    public function run(): void
    {
        $now = now();

        DB::table('collections')->insertOrIgnore([
            [
                'slug' => 'my-collection',
                'name' => 'My Collection',
                'description' => null,
                'is_default' => true,
                'is_wishlist' => false,
                'sort_order' => 0,
                'created_at' => $now,
                'updated_at' => $now,
            ],
            [
                'slug' => 'wishlist',
                'name' => 'Wishlist',
                'description' => null,
                'is_default' => true,
                'is_wishlist' => true,
                'sort_order' => 1,
                'created_at' => $now,
                'updated_at' => $now,
            ],
        ]);
    }
}
