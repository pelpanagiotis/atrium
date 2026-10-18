# syntax=docker/dockerfile:1
#
# One image serves three Compose roles: the web app (default CMD), the
# migrations job (pnpm db:migrate), and the queue worker (pnpm worker).

FROM node:22-bookworm-slim AS base
ENV PNPM_HOME=/pnpm \
    PATH=/pnpm:$PATH \
    NEXT_TELEMETRY_DISABLED=1
# Bake pnpm into the image so containers never download it at start-up.
RUN corepack enable && corepack prepare pnpm@10.33.4 --activate
WORKDIR /app

# Full dependency tree, needed to run `next build`.
FROM base AS build
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile
COPY . .
RUN pnpm build \
 && rm -rf .next/cache .next/dev \
 && cp -r public .next/standalone/ \
 && cp -r .next/static .next/standalone/.next/

# Production dependencies only. tsx and postgres are runtime dependencies
# (migrations and the worker), so they stay in this set.
FROM base AS deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile --prod

FROM base AS runtime
ENV NODE_ENV=production \
    PORT=38471 \
    HOSTNAME=0.0.0.0
WORKDIR /app
COPY --from=deps --chown=node:node /app/node_modules ./node_modules
COPY --from=build --chown=node:node /app/.next/standalone ./standalone
COPY --chown=node:node package.json tsconfig.json ./
COPY --chown=node:node src ./src
COPY --chown=node:node scripts ./scripts
COPY --chown=node:node db ./db
USER node
EXPOSE 38471
# Web process. The Compose file overrides the command for migrate and worker.
CMD ["node", "standalone/server.js"]
