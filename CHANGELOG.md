# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- Laravel 13 backend and React 19 + TypeScript + Vite frontend scaffolded (`src/backend`, `src/frontend`).
- Pest installed for backend testing.
- Migrations for all tables in `docs/DATABASE_SCHEMA.md`.
- Seeders for the two default collections and a placeholder platform list (real IGDB sync pending API access).
- `docker-compose.yml` (app, queue, frontend, nginx, db, redis) and backend `Dockerfile`.
- `.env.example` updated for MySQL/Redis service names and IGDB/Screenscraper credential placeholders.
- `/api/health` route for the Phase 0 sanity check.
- Laravel Pint config and Prettier config + scripts for the frontend.
- Eloquent models + enums (`ItemType`, `ScrapeStatus`, `Priority`, etc.) for every table.
- Admin auth via Sanctum tokens: `POST /api/auth/login`, `POST /api/auth/logout`, `GET /api/auth/me` (US-100/101/102).
- `AdminUserSeeder` (reads `ADMIN_EMAIL`/`ADMIN_PASSWORD` from `.env`).
- Item CRUD (`ItemController`): public `GET /api/items`, `GET /api/items/{item}`; auth-gated create/update/delete (US-115/116).
- Rate limiting: general `api` limiter + a stricter `login` limiter (`AppServiceProvider`).
- `IgdbService` (Twitch OAuth + Apicalypse queries) and `ScrapeItemMetadataJob` (franchise/company/genre matching included) — exercised live end-to-end 2026-08-17 (Twitch app credentials obtained, `POST /api/items` with a real `igdb_id` correctly scraped description, release year, franchise, developer/publisher, genres, and raw IGDB payload).
- Frontend auth: axios client with Bearer-token interceptor, zustand auth store (persisted to localStorage), TanStack Query hooks (`useLogin`/`useLogout`/`useCurrentAdmin`), `ProtectedRoute`, `/admin/login` and `/admin` pages, routing via react-router-dom (US-100/101/102, full stack).
- Xdebug installed in the backend `Dockerfile` (dev image only) + `src/backend/docker/xdebug.ini`, for PHPStorm step debugging.
- PHPStorm HTTP Client requests (`requests/collectors-lib.http`, `requests/http-client.env.json`) covering health check, auth login/me/logout, and item CRUD.
- US-110 (admin add-item via IGDB search), full stack: `GET /api/search/igdb` (`IgdbSearchController`, matches/creates local `Platform` rows by `igdb_id` on the fly), `GET /api/collections` (`CollectionController`), and `AdminAddItemPage.tsx` (collection picker, ~400ms debounced search, result list with cover thumbnails, platform-confirm step, US-111 "Scraping...→Ready" status per added item).

### Fixed
- `Dockerfile` was missing the `redis` PHP extension, breaking anything touching cache/queue/rate-limiting ("Class \"Redis\" not found").
- nginx dotfile-deny rule was blocking Vite's `/node_modules/.vite/deps/...` cache requests (403) — removed, see `docker/nginx.conf`.
- Docker nginx moved from host port 80 → 8080 → 8090. Port 80 is taken by a native Homebrew nginx, and port 8080 turned out to be taken by that same native nginx too (serving other local vhosts, e.g. `Fortis`) — requests to `:8080` were silently answered by it instead of our container. `docker-compose.yml` and `.env`/`.env.example` (`APP_URL`, `FRONTEND_URL`) updated to `collectors-lib.test:8090`.
- `db` service host port moved from 3306 → 3307 (3306 is already used by another local MySQL install). Internal `DB_PORT` in `.env` stays 3306 (container-to-container, unaffected).
- `ScrapeItemMetadataJob` never matched/attached genres (`item_genres` stayed empty despite `igdb_raw.genres` having data) — added `matchGenres()` (mirrors `matchFranchise()`) and `item->genres()->sync(...)`.
- `ScrapeItemMetadataJob` only overwrote `title` when it was empty (`?:`), which never happens since `title` is required at creation — title is now always overwritten with IGDB's name once an item has an `igdb_id`, since IGDB is the authoritative source.
- `IgdbSearchController::matchPlatform()` matched existing platforms by `igdb_id` only, colliding on the unique `slug` constraint against `PlatformSeeder`'s pre-seeded rows (which intentionally have `igdb_id = null`) — e.g. searching a PS4 title 500'd on a duplicate `playstation-4` slug. Now also falls back to matching by slug and backfills `igdb_id` on the existing row instead of trying to insert a duplicate.
- `AdminAddItemPage.tsx` silently swallowed search errors (just stopped showing "Searching..." with no result and no error) — added error display and a "No results." state.
