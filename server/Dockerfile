## Multi-stage build.
##
## Stage 1 (builder) installs every dependency including TypeScript and
## tsx, then compiles src/ -> dist/. We want the full toolchain here so
## the runtime image stays clean.
##
## Stage 2 (runtime) starts from the same alpine base, copies in the
## compiled JS plus the production-only node_modules. This keeps the
## final image around 165 MB and free of build tools.

FROM node:22-alpine AS builder

WORKDIR /app

# Workspace install. We copy the manifests for all workspaces first so
# Docker's layer cache reuses node_modules whenever code changes but
# package.json doesn't.
COPY package.json package-lock.json* ./
COPY server/package.json ./server/
COPY client/package.json ./client/

RUN npm install --workspace=server --include-workspace-root --no-audit --no-fund

COPY server ./server
RUN npm run build --workspace=server

# Drop dev dependencies from the install before copying into the
# runtime stage. `npm prune --omit=dev` is the cheap way.
RUN npm prune --omit=dev --workspace=server


FROM node:22-alpine AS runtime

WORKDIR /app
ENV NODE_ENV=production
# Render injects PORT at runtime; the server reads it from process.env.

# Run as the built-in non-root `node` user.
USER node

## With npm workspaces, dependencies hoist into the root /app/node_modules
## (no per-workspace node_modules unless a version conflict forces one).
## So we copy only the root tree plus the server's compiled dist + manifest.
COPY --from=builder --chown=node:node /app/node_modules ./node_modules
COPY --from=builder --chown=node:node /app/package.json ./package.json
COPY --from=builder --chown=node:node /app/server/dist ./server/dist
COPY --from=builder --chown=node:node /app/server/package.json ./server/package.json

EXPOSE 8080

CMD ["node", "server/dist/server.js"]
