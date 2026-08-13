<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Base currency is EUR (implicit rate 1.0, not stored as a row). See DATABASE_SCHEMA.md.
        Schema::create('exchange_rates', function (Blueprint $table) {
            $table->id();
            $table->char('currency', 3);
            $table->decimal('rate', 12, 6);
            $table->timestamp('fetched_at')->nullable();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('exchange_rates');
    }
};
