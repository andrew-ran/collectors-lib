<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Facades\Storage;

class ItemPhoto extends Model
{
    protected $fillable = [
        'item_id',
        'file_path',
        'sort_order',
        'is_primary',
    ];

    /** US-117 -- `file_path` is a relative path on the `public` disk; the
     * API only ever exposes the resolved URL, same convention as
     * Gifter::avatar_url. */
    protected $appends = ['photo_url'];

    protected function casts(): array
    {
        return [
            'sort_order' => 'integer',
            'is_primary' => 'boolean',
        ];
    }

    public function item(): BelongsTo
    {
        return $this->belongsTo(Item::class);
    }

    public function getPhotoUrlAttribute(): string
    {
        return Storage::disk('public')->url($this->file_path);
    }
}
