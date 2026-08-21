<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\ExchangeRate;

/**
 * US-170/171 -- public, cached-rate lookup for the currency selector. EUR
 * is always included (it's the implicit base, rate 1.0, never stored as a
 * row). Other currencies are only included once ExchangeRateSyncJob has
 * actually populated a row for them -- the frontend treats a missing
 * currency as unavailable (US-006a's disabled-option pattern) rather than
 * guessing a rate.
 */
class ExchangeRateController extends Controller
{
    public function index()
    {
        // ->get()->pluck(), not ->query()->pluck() -- the latter reads the
        // raw column via the query builder and skips the model's
        // decimal:6 cast.
        $rates = ExchangeRate::all()->pluck('rate', 'currency');

        return response()->json([
            'EUR' => 1,
            ...$rates,
        ]);
    }
}
