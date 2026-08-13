<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('wishlist_details', function (Blueprint $table) {
            $table->id();
            $table->foreignId('item_id')->unique()->constrained('items')->cascadeOnDelete();
            $table->enum('condition_preference', ['new_only', 'used_ok', 'cartridge_only'])->nullable();
            $table->text('edition_note')->nullable();
            $table->decimal('price_new_estimate', 10, 2)->nullable();
            $table->decimal('price_used_estimate', 10, 2)->nullable();
            // 0-100. `priority` (low/medium/high) is derived from this in the app layer, not stored --
            // see DATABASE_SCHEMA.md's note that it may be a virtual column or computed, chosen here as
            // an Eloquent accessor to keep the migration portable across DB engines.
            $table->unsignedTinyInteger('desire_score')->nullable();
            $table->boolean('received')->default(false);
            $table->date('received_at')->nullable();
            $table->enum('acquisition_type', ['gifted', 'self_purchased'])->nullable();
            // Copied into items.purchase_price at the same time it's set -- see DATABASE_SCHEMA.md notes.
            $table->decimal('price_paid', 10, 2)->nullable();
            $table->foreignId('gifter_id')->nullable()->constrained('gifters')->nullOnDelete();
            $table->string('gifter_name_override')->nullable();
            $table->text('thank_you_note')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('wishlist_details');
    }
};
