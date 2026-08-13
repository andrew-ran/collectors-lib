<?php

namespace App\Models;

use App\Enums\AcquiredDatePrecision;
use App\Enums\ItemType;
use App\Enums\ScrapeStatus;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;

class Item extends Model
{
    use HasFactory;

    protected $fillable = [
        'collection_id',
        'type',
        'igdb_id',
        'custom_identifier',
        'title',
        'subtitle',
        'platform_id',
        'cover_image_path',
        'cover_image_url',
        'scrape_status',
        'scraped_at',
        'acquired_date',
        'acquired_date_precision',
        'purchase_price',
        'notes',
    ];

    protected function casts(): array
    {
        return [
            'type' => ItemType::class,
            'scrape_status' => ScrapeStatus::class,
            'acquired_date_precision' => AcquiredDatePrecision::class,
            'scraped_at' => 'datetime',
            'acquired_date' => 'date',
            'purchase_price' => 'decimal:2',
        ];
    }

    public function collection(): BelongsTo
    {
        return $this->belongsTo(Collection::class);
    }

    public function platform(): BelongsTo
    {
        return $this->belongsTo(Platform::class);
    }

    public function genres(): BelongsToMany
    {
        return $this->belongsToMany(Genre::class, 'item_genres');
    }

    public function metadata(): HasOne
    {
        return $this->hasOne(ItemMetadata::class);
    }

    public function photos(): HasMany
    {
        return $this->hasMany(ItemPhoto::class)->orderBy('sort_order');
    }

    public function wishlistDetail(): HasOne
    {
        return $this->hasOne(WishlistDetail::class);
    }

    /**
     * Resolution order for the card's primary image -- see DATABASE_SCHEMA.md,
     * item_photos notes.
     */
    public function primaryImagePath(): ?string
    {
        $primaryPhoto = $this->photos->firstWhere('is_primary', true);

        return $primaryPhoto->file_path ?? $this->cover_image_path;
    }
}
