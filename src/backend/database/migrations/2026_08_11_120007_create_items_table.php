<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('items', function (Blueprint $table) {
            $table->id();
            $table->foreignId('collection_id')->constrained('collections')->cascadeOnDelete();
            $table->enum('type', ['game', 'console', 'peripheral', 'book']);
            $table->integer('igdb_id')->nullable();
            $table->string('custom_identifier')->nullable();
            $table->string('title', 500);
            $table->string('subtitle', 500)->nullable();
            $table->foreignId('platform_id')->nullable()->constrained('platforms')->nullOnDelete();
            $table->string('cover_image_path', 1000)->nullable();
            $table->string('cover_image_url', 1000)->nullable();
            $table->enum('scrape_status', ['pending', 'scraping', 'scraped', 'failed', 'manual'])->default('pending');
            $table->timestamp('scraped_at')->nullable();
            $table->date('acquired_date')->nullable();
            // NULL when acquired_date is NULL. day = full date, month = month+year known, year = only year known.
            $table->enum('acquired_date_precision', ['day', 'month', 'year'])->nullable();
            // Always EUR. Admin-only, never shown to visitors. See DATABASE_SCHEMA.md notes on purchase price tracking.
            $table->decimal('purchase_price', 10, 2)->nullable();
            $table->text('notes')->nullable();
            $table->timestamps();

            $table->index('scrape_status');
            $table->index('type');
            $table->index('acquired_date');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('items');
    }
};
