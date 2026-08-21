<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

/**
 * US-180 -- generic key-value store for site-wide admin settings (see
 * docs/DATABASE_SCHEMA.md). Deliberately key-value rather than fixed
 * columns so future settings don't each need a migration.
 */
class Setting extends Model
{
    public $timestamps = false;

    protected $primaryKey = 'key';

    public $incrementing = false;

    protected $keyType = 'string';

    protected $fillable = [
        'key',
        'value',
        'updated_at',
    ];

    protected function casts(): array
    {
        return [
            'updated_at' => 'datetime',
        ];
    }
}
