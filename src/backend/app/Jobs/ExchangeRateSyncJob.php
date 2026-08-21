<?php

namespace App\Jobs;

use App\Models\ExchangeRate;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Throwable;

/**
 * US-172 -- refreshes cached EUR-based exchange rates monthly (scheduled in
 * routes/console.php). Source: open.er-api.com, a free no-auth-key endpoint
 * -- NOT frankfurter.app (this project's docs originally pointed at it, but
 * frankfurter is ECB-sourced and doesn't publish RUB or RSD at all, two of
 * the five currencies US-170 requires; confirmed live 2026-08-21, see
 * docs/DATABASE_SCHEMA.md). EUR itself is the implicit base (rate 1.0,
 * never stored as a row) -- only the other four currencies get rows.
 *
 * On any failure, leaves existing rows untouched rather than clearing them,
 * per US-172 ("last successfully cached rates are used").
 */
class ExchangeRateSyncJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    private const SOURCE_URL = 'https://open.er-api.com/v6/latest/EUR';

    /** @var list<string> */
    private const CURRENCIES = ['USD', 'RUB', 'PLN', 'RSD'];

    public int $tries = 3;

    public function handle(): void
    {
        try {
            $response = Http::timeout(15)->get(self::SOURCE_URL)->throw();
        } catch (Throwable $e) {
            Log::warning('ExchangeRateSyncJob: fetch failed, keeping existing rates.', [
                'error' => $e->getMessage(),
            ]);

            return;
        }

        $rates = $response->json('rates') ?? [];

        foreach (self::CURRENCIES as $currency) {
            if (! isset($rates[$currency])) {
                Log::warning("ExchangeRateSyncJob: {$currency} missing from response, skipped.");

                continue;
            }

            ExchangeRate::updateOrCreate(
                ['currency' => $currency],
                ['rate' => $rates[$currency], 'fetched_at' => now()],
            );
        }
    }
}
