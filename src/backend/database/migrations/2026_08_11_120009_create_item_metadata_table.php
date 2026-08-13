<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('item_metadata', function (Blueprint $table) {
            $table->id();
            $table->foreignId('item_id')->unique()->constrained('items')->cascadeOnDelete();
            $table->text('description')->nullable();
            $table->year('release_year')->nullable();
            $table->foreignId('franchise_id')->nullable()->constrained('franchises')->nullOnDelete();
            // Plain text, not a filter in v1. Autocomplete via the `companies` dictionary table.
            $table->string('developer', 500)->nullable();
            $table->string('publisher', 500)->nullable();
            $table->json('other_platforms')->nullable();
            $table->json('sequels')->nullable();
            $table->json('prequels')->nullable();
            $table->json('remakes')->nullable();
            $table->json('dlcs')->nullable();
            $table->json('igdb_raw')->nullable();
            $table->json('manual_overrides')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('item_metadata');
    }
};
