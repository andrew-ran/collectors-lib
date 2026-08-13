<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Gifter extends Model
{
    use HasFactory;

    protected $fillable = [
        'name',
        'avatar_path',
    ];

    public function wishlistDetails(): HasMany
    {
        return $this->hasMany(WishlistDetail::class);
    }
}
