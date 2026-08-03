FROM node:24-alpine AS build

WORKDIR /workspace
RUN corepack enable
COPY . .
ARG VITE_RUNTIME_HOST_URL
ARG VITE_WORKBENCH_ENVIRONMENT=container
ENV VITE_RUNTIME_HOST_URL=$VITE_RUNTIME_HOST_URL
ENV VITE_WORKBENCH_ENVIRONMENT=$VITE_WORKBENCH_ENVIRONMENT
RUN pnpm install --frozen-lockfile
RUN pnpm --filter @generative-ui/web-workbench build

FROM nginx:1.29-alpine

COPY apps/web-workbench/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /workspace/apps/web-workbench/dist /usr/share/nginx/html

EXPOSE 8080
