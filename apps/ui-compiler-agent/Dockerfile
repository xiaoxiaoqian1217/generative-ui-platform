FROM node:26-slim AS build
WORKDIR /workspace
RUN corepack enable && corepack prepare pnpm@10.13.1 --activate
COPY . .
RUN pnpm install --no-frozen-lockfile
RUN pnpm --filter @generative-ui/ui-compiler-agent... build

FROM node:26-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /workspace /app
EXPOSE 4101
CMD ["node", "apps/ui-compiler-agent/dist/main.js"]
