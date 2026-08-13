<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AdminUser;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;

class AuthController extends Controller
{
    /**
     * US-100 -- admin login. Single admin account, no self-service registration.
     */
    public function login(Request $request)
    {
        $credentials = $request->validate([
            'email' => ['required', 'email'],
            'password' => ['required', 'string'],
        ]);

        $admin = AdminUser::where('email', $credentials['email'])->first();

        if (! $admin || ! Hash::check($credentials['password'], $admin->password)) {
            throw ValidationException::withMessages([
                'email' => 'These credentials do not match our records.',
            ]);
        }

        // US-101 -- plain Sanctum API token, not cookie/session-based SPA auth.
        // The frontend stores this in localStorage and sends it as a Bearer
        // header. See ARCHITECTURE.md, Authentication.
        $token = $admin->createToken('admin-spa')->plainTextToken;

        return response()->json([
            'token' => $token,
            'admin' => $admin->only(['id', 'name', 'email']),
        ]);
    }

    /**
     * US-102 -- revokes only the token used for this request, not every
     * session the admin might have open elsewhere.
     */
    public function logout(Request $request)
    {
        $request->user()->currentAccessToken()->delete();

        return response()->noContent();
    }

    /**
     * Lets the SPA verify an existing token is still valid on load rather
     * than just assuming so. See US-101.
     */
    public function me(Request $request)
    {
        return response()->json($request->user()->only(['id', 'name', 'email']));
    }
}
