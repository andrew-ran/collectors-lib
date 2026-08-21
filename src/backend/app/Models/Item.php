<?php

namespace App\Models;

use App\Enums\AcquiredDatePrecision;
use App\Enums\ItemType;
use App\Enums\ScrapeStatus;
use Illuminate\Database\Eloquent\Casts\Attribute;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Support\Facades\Storage;

class Item extends Model
{
    use HasFactory;

    /** US-012 -- always expose a usable cover URL, see coverUrl(). US-118
     * additionally exposes the cover on its own (ignoring any primary
     * photo override) as `igdb_cover_url`, so ItemPhotoManager can always
     * render the "IGDB cover" base tile regardless of which photo currently
     * overrides it. */
    protected $appends = ['cover_url', 'igdb_cover_url'];

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
     * item_photos notes. Returns a resolved URL (not a raw disk path), same
     * as coverUrl() below -- see that accessor's docblock for why this
     * matters now that US-117 actually populates item_photos.file_path.
     */
    public function primaryImagePath(): ?string
    {
        $primaryPhoto = $this->photos->firstWhere('is_primary', true);

        if ($primaryPhoto) {
            return $primaryPhoto->photo_url;
        }

        return $this->cover_image_path ? Storage::disk('public')->url($this->cover_image_path) : null;
    }

    /**
     * US-012 -- primary image URL for the card: an admin-set primary photo
     * overrides `igdb_cover_url` below when one exists, otherwise falls
     * straight through to it. Guards on relationLoaded('photos') so callers
     * that didn't eager-load it (e.g. the lightweight index() list) don't
     * trigger a per-item N+1 query just from serializing this attribute.
     */
    protected function coverUrl(): Attribute
    {
        return Attribute::make(
            get: function () {
                if ($this->relationLoaded('photos')) {
                    $primaryPhoto = $this->photos->firstWhere('is_primary', true);

                    if ($primaryPhoto) {
                        return $primaryPhoto->photo_url;
                    }
                }

                return $this->igdb_cover_url;
            },
        );
    }

    /**
     * US-118 -- the cover on its own, independent of any primary-photo
     * override: a locally stored cover (once ImageService downloads/
     * converts it, see ScrapeItemMetadataJob) or, until then, hot-linking
     * IGDB's own cover straight from igdb_raw. This is what
     * ItemPhotoManager renders as the permanent "IGDB cover" tile.
     *
     * `cover_image_path` is a relative path on the `public` disk (same
     * convention as Gifter::avatar_path/ItemPhoto::file_path) -- resolved
     * to a real URL here via Storage, not returned raw. Nothing sets
     * `cover_image_path` yet (no local-cover downloader exists), so this
     * branch has been unexercised so far; fixed proactively while touching
     * this accessor for US-117/118, rather than left as a surprise for
     * whichever feature adds that downloader next.
     */
    protected function igdbCoverUrl(): Attribute
    {
        return Attribute::make(
            get: function () {
                if ($this->cover_image_path) {
                    return Storage::disk('public')->url($this->cover_image_path);
                }

                if ($this->cover_image_url) {
                    return $this->cover_image_url;
                }

                if ($this->relationLoaded('metadata')) {
                    $igdbCoverUrl = $this->metadata?->igdb_raw['cover']['url'] ?? null;

                    if ($igdbCoverUrl) {
                        return 'https:'.str_replace('t_thumb', 't_cover_big', $igdbCoverUrl);
                    }
                }

                return null;
            },
        );
    }
}
