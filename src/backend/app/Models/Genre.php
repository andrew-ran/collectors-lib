<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;

class Genre extends Model
{
    use HasFactory;

    protected $fillable = [
        'igdb_id',
        'name',
        'slug',
    ];

    public function items(): BelongsToMany
    {
        return $this->belongsToMany(Item::class, 'item_genres');
    }
}
