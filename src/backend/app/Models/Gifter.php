<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Facades\Storage;

class Gifter extends Model
{
    use HasFactory;

    protected $fillable = [
        'name',
        'avatar_path',
    ];

    /** US-160 -- `avatar_path` is a relative path on the `public` disk;
     * the API only ever exposes the resolved URL, never the raw path. */
    protected $appends = ['avatar_url'];

    public function wishlistDetails(): HasMany
    {
        return $this->hasMany(WishlistDetail::class);
    }

    public function getAvatarUrlAttribute(): ?string
    {
        return $this->avatar_path ? Storage::disk('public')->url($this->avatar_path) : null;
    }
}
