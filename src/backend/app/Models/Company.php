<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

/**
 * Autocomplete dictionary only -- not a FK from item_metadata.
 * See DATABASE_SCHEMA.md for why this is deliberately not a relation.
 */
class Company extends Model
{
    use HasFactory;

    protected $fillable = [
        'igdb_id',
        'name',
    ];
}
