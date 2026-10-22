# Production "web" image: builds the React SPA and bakes the result into an
# nginx image alongside the production nginx config. Built by CI (see
# .github/workflows/deploy.yml) and pushed to GHCR -- the VPS only ever
# pulls this image and never runs `npm install`/`vite build` itself. This
# replaces the old approach of a one-shot `frontend-build` container +
# shared volume (see git history of docker-compose.prod.example.yml) --
# that ran the build on the VPS itself, which is exactly the resource-heavy
# step we want CI to absorb instead on a small (2 vCPU / 1GB RAM) box.
#
# Build context is the repo root (not src/frontend), so it can also COPY
# the nginx config from docker/. See the build-push-action step in the
# deploy workflow for the exact `context`/`file` values.

# --platform=$BUILDPLATFORM: the SPA bundle is plain static JS/CSS, identical
# for every architecture, so it is built once on the runner's native arch
# instead of once per target platform. Running `npm ci` for linux/arm64
# under QEMU emulation crashed with "qemu: uncaught target signal 4
# (Illegal instruction)" and hung the CI job; only the final nginx stage is
# per-platform, and it just copies files (nothing executes under emulation).
FROM --platform=$BUILDPLATFORM node:22-alpine AS build
WORKDIR /app
COPY src/frontend/package*.json ./
RUN npm ci
COPY src/frontend/ ./
RUN npm run build

FROM nginx:alpine
COPY --from=build /app/dist /var/www/frontend-dist
COPY docker/nginx.prod.conf /etc/nginx/conf.d/default.conf
