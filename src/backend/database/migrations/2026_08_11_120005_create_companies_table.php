<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('companies', function (Blueprint $table) {
            $table->id();
            // Autocomplete dictionary only -- not a FK from item_metadata (see DATABASE_SCHEMA.md).
            $table->integer('igdb_id')->nullable()->unique();
            $table->string('name', 500);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('companies');
    }
};
