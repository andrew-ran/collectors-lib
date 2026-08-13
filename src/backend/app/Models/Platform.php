<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Platform extends Model
{
    use HasFactory;

    protected $fillable = [
        'igdb_id',
        'name',
        'slug',
        'abbreviation',
        'generation',
    ];

    public function items(): HasMany
    {
        return $this->hasMany(Item::class);
    }
}
