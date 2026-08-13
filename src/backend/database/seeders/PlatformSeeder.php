<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class PlatformSeeder extends Seeder
{
    /**
     * Placeholder platform list for local development.
     *
     * The real list is meant to be seeded from IGDB (see ARCHITECTURE.md's Caching
     * Strategy -- seeded once, refreshed only via an explicit manual admin action).
     * That requires IGDB credentials, which aren't set up yet (see docs/tz/NEXT_STEPS.md).
     * `igdb_id` is deliberately left null here rather than guessing real IGDB IDs --
     * once IgdbService exists, a proper sync should populate/replace these rows.
     */
    public function run(): void
    {
        $now = now();

        $platforms = [
            ['name' => 'Nintendo Entertainment System', 'abbreviation' => 'NES'],
            ['name' => 'Super Nintendo Entertainment System', 'abbreviation' => 'SNES'],
            ['name' => 'Nintendo 64', 'abbreviation' => 'N64'],
            ['name' => 'GameCube', 'abbreviation' => 'GC'],
            ['name' => 'Wii', 'abbreviation' => 'Wii'],
            ['name' => 'Wii U', 'abbreviation' => 'WiiU'],
            ['name' => 'Nintendo Switch', 'abbreviation' => 'Switch'],
            ['name' => 'Game Boy', 'abbreviation' => 'GB'],
            ['name' => 'Game Boy Color', 'abbreviation' => 'GBC'],
            ['name' => 'Game Boy Advance', 'abbreviation' => 'GBA'],
            ['name' => 'Nintendo DS', 'abbreviation' => 'NDS'],
            ['name' => 'Nintendo 3DS', 'abbreviation' => '3DS'],
            ['name' => 'Sega Mega Drive/Genesis', 'abbreviation' => 'MD'],
            ['name' => 'Sega Saturn', 'abbreviation' => 'Saturn'],
            ['name' => 'Sega Dreamcast', 'abbreviation' => 'DC'],
            ['name' => 'PlayStation', 'abbreviation' => 'PS1'],
            ['name' => 'PlayStation 2', 'abbreviation' => 'PS2'],
            ['name' => 'PlayStation 3', 'abbreviation' => 'PS3'],
            ['name' => 'PlayStation 4', 'abbreviation' => 'PS4'],
            ['name' => 'PlayStation Portable', 'abbreviation' => 'PSP'],
            ['name' => 'PC', 'abbreviation' => 'PC'],
        ];

        DB::table('platforms')->insertOrIgnore(
            collect($platforms)->map(fn (array $p) => [
                'igdb_id' => null,
                'name' => $p['name'],
                'slug' => Str::slug($p['name']),
                'abbreviation' => $p['abbreviation'],
                'generation' => null,
                'created_at' => $now,
                'updated_at' => $now,
            ])->all()
        );
    }
}
