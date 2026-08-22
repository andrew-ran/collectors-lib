<?php

namespace App\Console\Commands;

use App\Models\AdminUser;
use Database\Seeders\CollectionSeeder;
use Database\Seeders\PlatformSeeder;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Artisan;

/**
 * Interactive first-run setup wizard for self-hosters -- see
 * ARCHITECTURE.md "Self-hosting Considerations" and REQUIREMENTS.md's
 * non-functional requirements. Replaces the previous Phase 1 stand-in
 * (`php artisan migrate --seed`, relying on ADMIN_EMAIL/ADMIN_PASSWORD
 * already being set in .env before seeding -- see AdminUserSeeder's
 * docblock, which explicitly named this command as its planned successor).
 *
 * Deliberately does NOT call AdminUserSeeder: that seeder reads the admin
 * password from .env, which means it sits there in plaintext on disk
 * indefinitely. This command instead prompts for the password interactively
 * (masked input, never written to .env) and writes it straight into the
 * `admin_users` table via the model's `password` => 'hashed' cast -- a
 * strictly better security story for a wizard a human is actually present
 * for. `AdminUserSeeder` still exists as-is for automated contexts (CI,
 * `php artisan migrate --seed`) where no one is present to type a password.
 *
 * Safe to re-run: every step either checks its own already-done state
 * (storage:link, an existing admin account, existing IGDB credentials) or
 * is naturally idempotent (`migrate`, and CollectionSeeder/PlatformSeeder's
 * `insertOrIgnore` calls).
 */
class SetupCommand extends Command
{
    protected $signature = 'setup';

    protected $description = 'Interactive first-run setup: migrations, storage link, default data, IGDB credentials, admin account';

    public function handle(): int
    {
        $this->info('Collectors Lib -- first-run setup');
        $this->newLine();

        if (! file_exists(base_path('.env'))) {
            $this->components->error(
                '.env not found. Copy .env.example to .env (and set DB_*/REDIS_* to match '.
                'docker-compose.yml if you haven\'t already), then re-run this command.',
            );

            return self::FAILURE;
        }

        if (! config('app.key')) {
            $this->components->task('Generating application key', fn () => Artisan::call('key:generate') === 0);
        }

        $this->components->task(
            'Running database migrations',
            fn () => Artisan::call('migrate', ['--force' => true]) === 0,
        );

        $this->components->task('Linking storage (public/storage)', function () {
            if (is_link(public_path('storage'))) {
                return true;
            }

            return Artisan::call('storage:link') === 0;
        });

        $this->components->task(
            'Seeding default collections (My Collection / Wishlist)',
            fn () => Artisan::call('db:seed', ['--class' => CollectionSeeder::class, '--force' => true]) === 0,
        );

        $this->components->task(
            'Seeding placeholder platform list',
            fn () => Artisan::call('db:seed', ['--class' => PlatformSeeder::class, '--force' => true]) === 0,
        );

        $this->newLine();
        $this->setupIgdbCredentials();
        $this->newLine();
        $this->setupAdminAccount();

        // IGDB credentials just changed on disk -- if config caching is ever
        // turned on for a self-hosted deploy, config('services.igdb.*') would
        // otherwise keep serving the old (empty) cached values.
        Artisan::call('config:clear');

        $this->newLine();
        $this->components->info('Setup complete -- log in at /admin/login with the admin account above.');

        return self::SUCCESS;
    }

    /**
     * IGDB (Twitch Developer app) credentials, needed for the game-add
     * auto-scrape flow (US-110) -- see docs/API_SOURCES.md. Optional: a
     * self-hoster can skip this and add books/consoles/peripherals manually
     * (US-121/122) in the meantime, or come back and set
     * IGDB_CLIENT_ID/IGDB_CLIENT_SECRET in .env by hand later.
     */
    private function setupIgdbCredentials(): void
    {
        $currentClientId = config('services.igdb.client_id');

        if ($currentClientId) {
            $this->line("IGDB credentials are already set (Client ID: {$currentClientId}).");

            if (! $this->confirm('Replace them?', false)) {
                return;
            }
        } else {
            $this->line('IGDB (Twitch Developer) credentials let game adds auto-fill cover/genres/etc.');
            $this->line('Register a free app at https://dev.twitch.tv to get a Client ID/Secret.');
        }

        $clientId = $this->ask('IGDB Client ID (leave blank to skip)');

        if (! $clientId) {
            $this->components->warn('Skipped -- set IGDB_CLIENT_ID/IGDB_CLIENT_SECRET in .env manually later.');

            return;
        }

        $clientSecret = $this->secret('IGDB Client Secret') ?? '';

        $this->updateEnvValue('IGDB_CLIENT_ID', $clientId);
        $this->updateEnvValue('IGDB_CLIENT_SECRET', $clientSecret);

        $this->components->info('IGDB credentials saved to .env.');
    }

    /**
     * The single owner account (see ARCHITECTURE.md, Authentication -- no
     * registration, one admin). `updateOrCreate` by email mirrors
     * AdminUserSeeder's own idempotency, so re-running this to change the
     * password later (or after picking "replace" below) just works.
     */
    private function setupAdminAccount(): void
    {
        $existing = AdminUser::first();

        if ($existing) {
            $this->line("An admin account already exists ({$existing->email}).");

            if (! $this->confirm('Create or replace the admin account?', false)) {
                return;
            }
        }

        $email = $this->ask('Admin email', $existing->email ?? 'admin@example.com');

        $password = $this->secret('Admin password (input hidden, min 8 characters)');
        while (! $password || strlen($password) < 8) {
            $this->components->warn('Password must be at least 8 characters.');
            $password = $this->secret('Admin password (input hidden, min 8 characters)');
        }

        AdminUser::updateOrCreate(
            ['email' => $email],
            ['name' => 'Admin', 'password' => $password],
        );

        $this->components->info("Admin account ready: {$email}");
    }

    /**
     * Laravel has no built-in "set one .env value" helper -- this is the
     * common minimal pattern: replace the line if the key already exists
     * (commented out or not), else append it. Values containing whitespace
     * are quoted, same convention .env files already use elsewhere (e.g.
     * APP_NAME="Collectors Lib" in .env.example).
     */
    private function updateEnvValue(string $key, string $value): void
    {
        $path = base_path('.env');
        $content = file_get_contents($path) ?: '';

        $formattedValue = str_contains($value, ' ') || $value === ''
            ? '"'.addslashes($value).'"'
            : $value;

        $pattern = '/^'.preg_quote($key, '/').'=.*/m';
        $line = "{$key}={$formattedValue}";

        $content = preg_match($pattern, $content)
            ? preg_replace($pattern, $line, $content)
            : rtrim($content)."\n{$line}\n";

        file_put_contents($path, $content);
    }
}
