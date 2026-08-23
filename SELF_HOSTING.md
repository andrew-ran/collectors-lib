# Self-Hosting Guide

This guide covers running Collectors Lib on your own server: local/LAN use, and a public deployment with HTTPS and backups.

## Prerequisites

- Docker and Docker Compose
- (Optional, but recommended) An IGDB/Twitch Developer account for automatic game metadata — register a free application at [dev.twitch.tv](https://dev.twitch.tv). You can skip this and add everything manually (books, consoles, peripherals, and games) if you'd rather not bother.
- A domain name, if you're deploying somewhere other people can reach it (not needed for local/LAN-only use)

## Quick Start (local or LAN use)

```bash
git clone https://github.com/YOUR_USERNAME/collectors-lib
cd collectors-lib
cp src/backend/.env.example src/backend/.env
docker compose up -d --build
docker compose exec app php artisan setup
```

`php artisan setup` is an interactive wizard that generates your app key, runs migrations, links storage, seeds the default collections and a placeholder platform list, then asks for your IGDB credentials (skippable) and creates your admin account (email + password — this is never written to `.env`, unlike the old manual seeding path). It's safe to re-run later if you want to rotate the admin password or add IGDB credentials you skipped the first time.

Once it finishes, visit the app at the URL from your `.env`'s `APP_URL` and log in at `/admin/login`.

Plain HTTP is fine here — this mode is for trying the app out on your own machine or LAN, not for exposing it to the internet.

## Public Deployment (HTTPS)

**The `docker-compose.yml` in this repo is written for local development** — the frontend container runs Vite's dev server (not a production build), and the `db`/`redis` services publish their ports directly to the host for easy local debugging. Don't expose this setup to the public internet as-is.

For a public deployment, you need to:

1. **Build production images instead of running dev containers.** `docker/web.Dockerfile` builds the React SPA and bakes it into an nginx image with a production nginx config; the existing backend `Dockerfile` (already used by `app`/`queue`/`scheduler`) works as-is. Either build these yourself on the server, or (recommended, especially on a small VPS) let CI build them — see "Automatic deploys (CI/CD)" below.
2. **Put a reverse proxy in front for HTTPS.** Caddy is the easiest default — automatic certificate issuance and renewal, no separate certbot setup. Traefik is a solid alternative if you're already using it elsewhere.

   This repo includes a worked (but not live-tested against your exact setup) example for Caddy: `docker-compose.prod.example.yml`, `Caddyfile.example`, and `docker/nginx.prod.conf.example` together show `caddy` terminating HTTPS and proxying to `web` (the built SPA + nginx image), which in turn routes `/api`/`/up`/`/storage` to `app`. Copy whichever pieces you need, rename the `.example` files, fill in your real domain and image names, and test the result yourself before relying on it.

3. **Don't publish `db`/`redis` ports to the host** in a public deployment — they're only exposed in `docker-compose.yml` for local debugging convenience. Remove those `ports:` entries (or override them to empty) once you're not connecting to them directly from your host machine anymore.
4. **Change the default database passwords** (`DB_PASSWORD`/`MYSQL_ROOT_PASSWORD` in `.env` and `docker-compose.yml`'s `db` service) — the checked-in defaults (`secret`) are fine for local dev only.

### Automatic deploys (CI/CD)

`.github/workflows/deploy.yml` builds the `app` and `web` images on GitHub's own runners, pushes them to GHCR, then SSHes into your server to `docker compose pull` + `up -d`. Your server never runs `composer install`/`npm install`/`vite build` itself — worth having on a resource-constrained VPS, where running those steps locally can cause real slowdowns or hangs.

It only runs on `push` to `master`, i.e. only when the repo owner pushes — GitHub doesn't hand repository secrets to a workflow triggered from a fork's pull request, so this is safe to keep committed even though the repo (and this workflow file) is public. Anyone self-hosting their own copy needs to point their own `DEPLOY_HOST`/`DEPLOY_USER`/`DEPLOY_SSH_KEY` secrets at their own server for it to do anything — it's inert otherwise.

To set it up: add those three secrets under the repo's Settings → Secrets and variables → Actions (a dedicated deploy SSH keypair with its public half in the server user's `~/.ssh/authorized_keys` is safer than reusing your own personal key), and after the first successful run, set both pushed GHCR packages' visibility to Public so the server can pull them without its own registry login.

### `.ru` / `.su` domains

Let's Encrypt (the default CA Caddy/Traefik use) has restricted issuance and renewal for `.ru`/`.su` domains as of mid-2026. If your domain is affected, you'll need an alternative certificate authority — the Russian national CA, issued through Gosuslugi, is the current path for this. Check current Minsvyaz/Gosuslugi documentation for the exact process, since this is an evolving situation; Caddy and Traefik both support a custom/manual ACME CA or an externally-issued certificate if the automatic path doesn't work for your domain.

### CDN / DDoS filtering (optional)

A third-party CDN (e.g. Cloudflare) in front of your deployment is entirely optional and not a default recommendation here. Russian ISPs have been throttling Cloudflare-proxied traffic since mid-2026 — if part of your audience is in Russia, putting your site behind Cloudflare may make it slower or less reliable for them specifically. Weigh this against whatever DDoS/bot-filtering benefit you're after for your own situation.

## Backups

A simple daily cron job covering both things that actually hold your data — the MySQL database and the `storage/app/public` folder (covers, item photos, gifter avatars):

```bash
#!/bin/bash
# /etc/cron.daily/collectors-lib-backup (make executable: chmod +x)
set -euo pipefail

BACKUP_DIR="/path/to/your/backups"
STAMP=$(date +%Y-%m-%d)
COMPOSE_DIR="/path/to/collectors-lib"

cd "$COMPOSE_DIR"

docker compose exec -T db mysqldump -u collectors_lib -psecret collectors_lib \
  | gzip > "$BACKUP_DIR/db-$STAMP.sql.gz"

tar czf "$BACKUP_DIR/storage-$STAMP.tar.gz" -C src/backend/storage/app public

# Keep the last 14 days, delete anything older.
find "$BACKUP_DIR" -name '*.gz' -mtime +14 -delete
```

Adjust the `mysqldump` credentials to match whatever you set `DB_PASSWORD` to (don't leave the `secret` default in a real deployment, per above). Restoring is the reverse: `gunzip < backup.sql.gz | docker compose exec -T db mysql -u collectors_lib -p... collectors_lib`, and un-tar the storage archive back into `src/backend/storage/app/public`.

## Updating

```bash
git pull
docker compose up -d --build
docker compose exec app php artisan migrate
```

`php artisan setup` is also safe to re-run any time after an update (e.g. if a new version adds a migration or a new optional credential) — every step in it checks its own already-done state before doing anything.

## Getting Help

This is a personal open-source project, not a commercially supported product. Bug reports and pull requests are welcome via GitHub issues.
