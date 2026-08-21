<?php

use App\Jobs\ExchangeRateSyncJob;
use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schedule;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

// US-172 -- actually fires via the `scheduler` service in
// docker-compose.yml (`php artisan schedule:work`). The table is empty on
// a fresh install either way, though -- run once manually via
// `php artisan tinker` -> `App\Jobs\ExchangeRateSyncJob::dispatch();` to
// populate exchange_rates for the first time, rather than waiting a month.
Schedule::job(new ExchangeRateSyncJob)->monthly();
