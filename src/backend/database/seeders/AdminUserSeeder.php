<?php

namespace Database\Seeders;

use App\Models\AdminUser;
use Illuminate\Database\Seeder;

class AdminUserSeeder extends Seeder
{
    /**
     * Seeds the single admin account from ADMIN_EMAIL/ADMIN_PASSWORD in .env --
     * see ARCHITECTURE.md, Authentication ("owner account seeded via
     * php artisan db:seed"). A proper `artisan setup` wizard is planned for
     * Phase 3 self-hosting; this is the Phase 1 stand-in. Re-running this
     * seeder updates the password if the .env value changed.
     */
    public function run(): void
    {
        $email = env('ADMIN_EMAIL', 'admin@example.com');
        $password = env('ADMIN_PASSWORD', 'password');

        AdminUser::updateOrCreate(
            ['email' => $email],
            ['name' => 'Admin', 'password' => $password],
        );
    }
}
