<?php

namespace App\Enums;

/**
 * Derived from wishlist_details.desire_score in the app layer -- see US-020
 * and DATABASE_SCHEMA.md's note on the `priority` column.
 */
enum Priority: string
{
    case Low = 'low';
    case Medium = 'medium';
    case High = 'high';

    public static function fromDesireScore(?int $score): ?self
    {
        return match (true) {
            $score === null => null,
            $score <= 33 => self::Low,
            $score <= 66 => self::Medium,
            default => self::High,
        };
    }
}
