<?php

namespace App\Enums;

enum AcquiredDatePrecision: string
{
    case Day = 'day';
    case Month = 'month';
    case Year = 'year';
}
