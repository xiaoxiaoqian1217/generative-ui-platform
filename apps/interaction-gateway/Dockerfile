FROM node:24-slim AS build
WORKDIR /workspace
RUN corepack enable && corepack prepare pnpm@10.13.1 --activate
COPY . .
RUN pnpm install --no-frozen-lockfile
RUN pnpm --filter @generative-ui/interaction-gateway... build

FROM node:24-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /workspace /app
EXPOSE 4100
CMD ["node", "apps/interaction-gateway/dist/main.js"]
