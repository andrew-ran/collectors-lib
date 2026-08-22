<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('item_metadata', function (Blueprint $table) {
            // US-121 -- book author. `developer`/`publisher` are reused
            // as-is across item types (a book's publisher fits that column
            // fine), but there's no game-side equivalent of "author" to
            // reuse, so this is a new column rather than a repurposed one.
            // Plain text, same as developer/publisher -- no dictionary
            // table/autocomplete for authors in v1.
            $table->string('author', 500)->nullable()->after('publisher');
        });
    }

    public function down(): void
    {
        Schema::table('item_metadata', function (Blueprint $table) {
            $table->dropColumn('author');
        });
    }
};
