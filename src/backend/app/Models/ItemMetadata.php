<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ItemMetadata extends Model
{
    protected $table = 'item_metadata';

    protected $fillable = [
        'item_id',
        'description',
        'release_year',
        'franchise_id',
        'developer',
        'publisher',
        'other_platforms',
        'sequels',
        'prequels',
        'remakes',
        'remasters',
        'dlcs',
        'igdb_raw',
        'manual_overrides',
    ];

    protected function casts(): array
    {
        return [
            'other_platforms' => 'array',
            'sequels' => 'array',
            'prequels' => 'array',
            'remakes' => 'array',
            'remasters' => 'array',
            'dlcs' => 'array',
            'igdb_raw' => 'array',
            'manual_overrides' => 'array',
        ];
    }

    public function item(): BelongsTo
    {
        return $this->belongsTo(Item::class);
    }

    public function franchise(): BelongsTo
    {
        return $this->belongsTo(Franchise::class);
    }

    /**
     * True if the admin has manually overridden this field, meaning a
     * re-scrape should not touch it. See DATABASE_SCHEMA.md, manual_overrides.
     */
    public function isOverridden(string $field): bool
    {
        return (bool) ($this->manual_overrides[$field] ?? false);
    }
}
