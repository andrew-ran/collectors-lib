FROM php:8.3-fpm

RUN apt-get update && apt-get install -y --no-install-recommends \
        git \
        unzip \
        pkg-config \
        libzip-dev \
        libpng-dev \
        libjpeg62-turbo-dev \
        libfreetype6-dev \
        libwebp-dev \
        libmagickwand-dev \
        libonig-dev \
    && docker-php-ext-configure gd --with-freetype --with-jpeg --with-webp \
    && docker-php-ext-install pdo_mysql mbstring zip gd bcmath exif \
    && pecl install imagick redis xdebug \
    && docker-php-ext-enable imagick redis xdebug \
    && rm -rf /var/lib/apt/lists/*

# Xdebug is dev-only (see docker-compose.yml comments -- this whole Dockerfile
# is the Phase 0 dev image; a separate lean prod image is a Phase 3+ concern).
# Step debugging in PHPStorm: Settings -> PHP -> Debug -> Xdebug port 9003,
# then Settings -> PHP -> Servers -> add a server named "collectors-lib" with
# a path mapping src/backend -> /var/www/html, and toggle "Start Listening
# for PHP Debug Connections" in the toolbar.
COPY docker/xdebug.ini /usr/local/etc/php/conf.d/xdebug.ini

COPY --from=composer:2 /usr/bin/composer /usr/bin/composer

WORKDIR /var/www/html

COPY . .

RUN composer install --no-interaction --prefer-dist --optimize-autoloader \
    && chown -R www-data:www-data /var/www/html/storage /var/www/html/bootstrap/cache

EXPOSE 9000

CMD ["php-fpm"]
