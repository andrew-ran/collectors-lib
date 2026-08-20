<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('item_metadata', function (Blueprint $table) {
            // IGDB returns remasters (GAME_FIELDS in IgdbService) but this
            // was previously discarded -- captured now for possible future
            // use, not necessarily displayed yet. See US-011 tech debt note.
            $table->json('remasters')->nullable()->after('remakes');
        });
    }

    public function down(): void
    {
        Schema::table('item_metadata', function (Blueprint $table) {
            $table->dropColumn('remasters');
        });
    }
};
