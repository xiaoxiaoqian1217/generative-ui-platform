FROM node:24-alpine AS build
WORKDIR /workspace
COPY . .
RUN corepack enable && pnpm install --frozen-lockfile --ignore-scripts && pnpm build && pnpm --config.ignore-scripts=true --filter @generative-ui/ui-compiler-service deploy --prod --legacy /app

FROM node:24-alpine
WORKDIR /app
ENV NODE_ENV=production
ENV UI_COMPILER_HOST=0.0.0.0
ENV UI_COMPILER_PORT=3000
COPY --from=build --chown=node:node /app ./
USER node
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 CMD node -e "fetch('http://127.0.0.1:3000/health').then((response) => process.exit(response.ok ? 0 : 1)).catch(() => process.exit(1))"
CMD ["node", "dist/cli.js"]
