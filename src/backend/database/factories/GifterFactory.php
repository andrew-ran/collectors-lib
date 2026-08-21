<?php

namespace Database\Factories;

use App\Models\Gifter;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Gifter>
 */
class GifterFactory extends Factory
{
    protected $model = Gifter::class;

    public function definition(): array
    {
        return [
            'name' => fake()->firstName(),
            'avatar_path' => null,
        ];
    }
}
