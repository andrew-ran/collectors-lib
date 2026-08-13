<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('item_photos', function (Blueprint $table) {
            $table->id();
            $table->foreignId('item_id')->constrained('items')->cascadeOnDelete();
            $table->string('file_path', 1000);
            $table->unsignedSmallInteger('sort_order')->default(0);
            // At most one row per item may be true -- enforced in the app layer, see DATABASE_SCHEMA.md.
            $table->boolean('is_primary')->default(false);
            $table->timestamps();

            $table->index('is_primary');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('item_photos');
    }
};
