# Collectors Lib

**The collection tracker your friends check before they buy you a gift.**

> A beautiful, self-hosted web app to showcase your retro game & peripheral collection and manage your wishlist.

**Status:** 🟢 v1.0.0 released — [live demo](https://collectors-lib.com)

## What is this?

Collectors Lib is a personal collection manager and public showcase for retro console games, consoles, peripherals, and books. You manage your items privately; the world browses them publicly. Friends and family can use your wishlist to pick the perfect gift.

## Key Features

- 📺 Horizontal SPA interface — one item per screen, navigated by arrows
- 🎮 Automatic metadata from IGDB (title, description, genre, platform, franchise, sequels) for games, and from OpenLibrary (title, author, publisher, year, cover) for books via ISBN lookup
- 🖼️ Cover art and photos (multi-photo galleries with a lightbox) converted to WebP and cached locally
- 📦 Multiple named collections (defaults: "My Collection" + "Wishlist")
- 🔍 Filters and search: by platform, genre, collection status, franchise, title
- 🎁 Wishlist fields: condition preference, edition, estimated prices, gifter tracking, currency conversion (EUR/USD/RUB/PLN/RSD)
- 📱 Responsive: desktop one-item-at-a-time view, mobile table/item view toggle
- 🌐 Fully public — share your collection URL with anyone
- 🐳 Self-hostable via Docker, with a guided first-run setup wizard

## Tech Stack

- **Backend:** Laravel 13 (PHP) — REST API
- **Frontend:** React 19 + TypeScript — SPA
- **Database:** MySQL 8
- **Cache/Queue:** Redis
- **Container:** Docker + Docker Compose
- **CI/CD:** GitHub Actions

## Quick Start

```bash
git clone https://github.com/andrew-ran/collectors-lib.git
cd collectors-lib
cp src/backend/.env.example src/backend/.env
docker compose up -d --build
docker compose exec app php artisan setup
```

`php artisan setup` is an interactive wizard: it generates your app key, runs migrations, links storage, seeds default data, then asks for your (optional) IGDB credentials and creates your admin account. See [SELF_HOSTING.md](SELF_HOSTING.md) for a public deployment with HTTPS and backups.

## License

MIT
