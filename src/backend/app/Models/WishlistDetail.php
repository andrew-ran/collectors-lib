<?php

namespace App\Models;

use App\Enums\AcquisitionType;
use App\Enums\ConditionPreference;
use App\Enums\Priority;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class WishlistDetail extends Model
{
    protected $fillable = [
        'item_id',
        'condition_preference',
        'edition_note',
        'price_new_estimate',
        'price_used_estimate',
        'desire_score',
        'received',
        'received_at',
        'acquisition_type',
        'price_paid',
        'gifter_id',
        'gifter_name_override',
        'thank_you_note',
    ];

    protected function casts(): array
    {
        return [
            'condition_preference' => ConditionPreference::class,
            'acquisition_type' => AcquisitionType::class,
            'price_new_estimate' => 'decimal:2',
            'price_used_estimate' => 'decimal:2',
            'price_paid' => 'decimal:2',
            'desire_score' => 'integer',
            'received' => 'boolean',
            'received_at' => 'date',
        ];
    }

    public function item(): BelongsTo
    {
        return $this->belongsTo(Item::class);
    }

    public function gifter(): BelongsTo
    {
        return $this->belongsTo(Gifter::class);
    }

    /**
     * Derived from desire_score, not stored -- see US-020 and the migration's note.
     */
    public function priority(): ?Priority
    {
        return Priority::fromDesireScore($this->desire_score);
    }
}
