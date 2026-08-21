<?php

namespace App\Services;

use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Imagick;

/**
 * Shared upload -> WebP pipeline, extracted from GifterController's original
 * storeAvatar() (US-160) once ItemPhotoController (US-117) needed the same
 * conversion at a different size cap. Every admin-uploaded image in the app
 * (gifter avatars, item photos, and eventually downloaded IGDB covers) goes
 * through here rather than each controller carrying its own Imagick calls.
 *
 * Always re-encodes to WebP rather than trusting the uploaded file's own
 * format -- this also strips EXIF/anything hidden in the file that isn't
 * actual image data (see REQUIREMENTS.md's upload-validation note). The
 * `imagick` PHP extension is already installed in the backend Dockerfile.
 */
class ImageService
{
    /**
     * Converts, resizes (bestfit within a square of $maxDimension, never
     * upscales), and stores $file as a `.webp` under $directory on the
     * `public` disk. Returns the stored relative path (e.g.
     * "gifters/<uuid>.webp"), not a URL -- callers expose the resolved URL
     * via their own model accessor, same as Gifter::avatar_url.
     */
    public function store(UploadedFile $file, string $directory, int $maxDimension, int $quality = 85): string
    {
        $source = new Imagick($file->getRealPath());
        // Animated GIFs load as a multi-frame Imagick object -- only the
        // first frame is kept; nothing this app stores needs to animate.
        $source->setIteratorIndex(0);
        $image = $source->getImage();
        $source->destroy();

        $image->autoOrient();

        if ($image->getImageWidth() > $maxDimension || $image->getImageHeight() > $maxDimension) {
            $image->resizeImage(
                $maxDimension,
                $maxDimension,
                Imagick::FILTER_LANCZOS,
                1,
                true, // bestfit -- preserve aspect ratio within the box
            );
        }

        $image->setImageFormat('webp');
        $image->setImageCompressionQuality($quality);
        $image->stripImage();

        $path = $directory.'/'.Str::uuid()->toString().'.webp';
        Storage::disk('public')->put($path, $image->getImagesBlob());

        $image->destroy();

        return $path;
    }
}
