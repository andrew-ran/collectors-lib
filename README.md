# Collectors Lib

**The collection tracker your friends check before they buy you a gift.**

> A beautiful, self-hosted web app to showcase your retro game & peripheral collection and manage your wishlist.

**Status:** 🚧 In development

## What is this?

Collectors Lib is a personal collection manager and public showcase for retro console games, consoles, peripherals, and books. You manage your items privately; the world browses them publicly. Friends and family can use your wishlist to pick the perfect gift.

Inspired by EmulationStation Desktop Edition — but built for the web, for collectors, not emulator users.

## Key Features

- 📺 Horizontal SPA interface — one item per screen, navigated by arrows
- 🎮 Automatic metadata from IGDB (title, description, genre, platform, franchise, sequels)
- 🖼️ Cover art fetched externally, converted to WebP and cached locally
- 📦 Multiple named collections (defaults: "My Collection" + "Wishlist")
- 🔍 Filters: by platform, genre, collection status, franchise
- 🎁 Wishlist fields: condition preference, edition, estimated prices
- 🌐 Fully public — share your collection URL with anyone
- 🐳 Self-hostable via Docker

## Tech Stack

- **Backend:** Laravel 13 (PHP) — REST API
- **Frontend:** React 19 + TypeScript — SPA
- **Database:** MySQL 8
- **Cache/Queue:** Redis
- **Container:** Docker + Docker Compose
- **CI/CD:** GitHub Actions

## Quick Start

```bash
git clone https://github.com/YOUR_USERNAME/collectors-lib
cd collectors-lib
cp src/backend/.env.example src/backend/.env
docker compose up -d --build
docker compose exec app php artisan setup
```

`php artisan setup` is an interactive wizard: it generates your app key, runs migrations, links storage, seeds default data, then asks for your (optional) IGDB credentials and creates your admin account. See [SELF_HOSTING.md](SELF_HOSTING.md) for a public deployment with HTTPS and backups.

## License

MIT
