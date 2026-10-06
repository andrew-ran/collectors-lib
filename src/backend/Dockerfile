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
    && pecl install imagick redis \
    && docker-php-ext-enable imagick redis \
    && rm -rf /var/lib/apt/lists/*

# Xdebug is dev-only: docker-compose.yml passes WITH_XDEBUG=true, the CI/prod
# build leaves it off. (It used to be baked into the prod image too, which
# made every `artisan` call on the server print "Xdebug: Could not connect to
# debugging client" and cost a slow pecl compile under QEMU on every build.)
# Step debugging in PHPStorm: Settings -> PHP -> Debug -> Xdebug port 9003,
# then Settings -> PHP -> Servers -> add a server named "collectors-lib" with
# a path mapping src/backend -> /var/www/html, and toggle "Start Listening
# for PHP Debug Connections" in the toolbar.
ARG WITH_XDEBUG=false
COPY docker/xdebug.ini /tmp/xdebug.ini
RUN if [ "$WITH_XDEBUG" = "true" ]; then \
        pecl install xdebug && docker-php-ext-enable xdebug \
        && cp /tmp/xdebug.ini /usr/local/etc/php/conf.d/xdebug.ini; \
    fi && rm /tmp/xdebug.ini

COPY --from=composer:2 /usr/bin/composer /usr/bin/composer

WORKDIR /var/www/html

# Dependency manifests first, so the (slow) composer install layer is reused
# from cache unless composer.json/composer.lock actually changed -- copying
# the whole source first would invalidate it on every code change.
COPY composer.json composer.lock ./

# --no-dev: this image is what actually runs in production (see
# .github/workflows/deploy.yml) -- require-dev packages (Pest, fakerphp/faker,
# mockery, etc.) have no business being in it. Doesn't affect local dev via
# docker-compose.yml: that setup bind-mounts src/backend over this image's
# vendor/ anyway, and dev dependencies get installed separately by running
# `composer install` (no --no-dev) directly against the bind-mounted source,
# same as it already needs to be after a fresh clone (see SELF_HOSTING.md).
RUN composer install --no-interaction --prefer-dist --no-dev --no-scripts --no-autoloader

COPY . .

# Autoloader + package discovery need the application code, hence after COPY.
RUN composer dump-autoload --optimize --no-dev \
    && chown -R www-data:www-data /var/www/html/storage /var/www/html/bootstrap/cache

EXPOSE 9000

CMD ["php-fpm"]
