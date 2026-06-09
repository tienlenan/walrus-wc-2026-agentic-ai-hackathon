FROM node:24-slim AS runner

WORKDIR /app
ENV NODE_ENV=production

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig.base.json ./
COPY apps/server/package.json apps/server/package.json
COPY packages packages
COPY apps/server apps/server

RUN corepack enable && pnpm install --frozen-lockfile

WORKDIR /app/apps/server
EXPOSE 4111

CMD ["pnpm", "start"]
