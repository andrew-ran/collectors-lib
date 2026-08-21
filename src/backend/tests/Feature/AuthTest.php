<?php

use App\Models\AdminUser;
use Illuminate\Support\Facades\Hash;
use Laravel\Sanctum\Sanctum;

/**
 * US-100/101/102 -- there's only ever one admin account, no self-service
 * registration, so these tests cover the login/logout/me loop rather than
 * account creation.
 */
test('login with correct credentials returns a token and the admin profile', function () {
    $admin = AdminUser::factory()->create([
        'password' => Hash::make('correct-password'),
    ]);

    $response = $this->postJson('/api/auth/login', [
        'email' => $admin->email,
        'password' => 'correct-password',
    ]);

    $response->assertOk()
        ->assertJsonStructure(['token', 'admin' => ['id', 'name', 'email']])
        ->assertJsonMissingPath('admin.password');
});

test('login with the wrong password is rejected', function () {
    $admin = AdminUser::factory()->create([
        'password' => Hash::make('correct-password'),
    ]);

    $response = $this->postJson('/api/auth/login', [
        'email' => $admin->email,
        'password' => 'wrong-password',
    ]);

    $response->assertUnprocessable()->assertJsonValidationErrors('email');
});

test('login with an unknown email is rejected the same way as a wrong password', function () {
    $response = $this->postJson('/api/auth/login', [
        'email' => 'nobody@example.com',
        'password' => 'anything',
    ]);

    $response->assertUnprocessable()->assertJsonValidationErrors('email');
});

test('logout revokes only the token used for the request', function () {
    $admin = AdminUser::factory()->create();
    $currentToken = $admin->createToken('current-session');
    $otherToken = $admin->createToken('other-session');

    $response = $this->withHeader('Authorization', "Bearer {$currentToken->plainTextToken}")
        ->postJson('/api/auth/logout');

    $response->assertNoContent();

    expect($admin->tokens()->find($currentToken->accessToken->id))->toBeNull();
    expect($admin->tokens()->find($otherToken->accessToken->id))->not->toBeNull();
});

test('me returns the currently authenticated admin', function () {
    $admin = AdminUser::factory()->create();

    Sanctum::actingAs($admin, ['*']);

    $response = $this->getJson('/api/auth/me');

    $response->assertOk()->assertJson([
        'id' => $admin->id,
        'name' => $admin->name,
        'email' => $admin->email,
    ]);
});

test('protected routes reject unauthenticated requests', function () {
    $this->getJson('/api/auth/me')->assertUnauthorized();
    $this->getJson('/api/gifters')->assertUnauthorized();
});
