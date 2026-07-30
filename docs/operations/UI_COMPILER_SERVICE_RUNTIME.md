# UI Compiler Service 独立运行

UI Compiler Service 可以在不依赖 Gateway、Copilot Runtime、真实业务 Agent 或前端运行时的情况下独立启动。

服务使用内置测试 Catalog 和确定性测试 Model Adapter。

它用于 HTTP、容器和运维验证，不能替代真实生产业务 Agent 集成。

## 启动

先在仓库根目录安装依赖并构建。

```powershell
pnpm install --frozen-lockfile
pnpm --filter @generative-ui/ui-compiler-service build
pnpm --filter @generative-ui/ui-compiler-service start
```

服务默认监听 `0.0.0.0:3000`。

`GET /health` 返回不包含配置或秘密的进程健康状态。

`GET /version` 返回服务名称和版本。

规范展示接口为 `POST /api/ui-compiler/present`。

## 配置

所有环境变量都在监听端口前完成校验。

无效配置以稳定错误码 `RUNTIME_CONFIGURATION_INVALID` 退出，且不会输出变量值。

| 变量 | 默认值 |
| --- | ---: |
| `UI_COMPILER_HOST` | `0.0.0.0` |
| `UI_COMPILER_PORT` | `3000` |
| `UI_COMPILER_MAX_REQUEST_BYTES` | `1048576` |
| `UI_COMPILER_REQUEST_DEADLINE_MS` | `30000` |
| `UI_COMPILER_HTTP_HEADERS_TIMEOUT_MS` | `5000` |
| `UI_COMPILER_HTTP_REQUEST_BODY_TIMEOUT_MS` | `10000` |
| `UI_COMPILER_HTTP_CONNECTIONS_CHECKING_INTERVAL_MS` | `1000` |
| `UI_COMPILER_MAX_DATA_DEPTH` | `32` |
| `UI_COMPILER_MAX_DATA_ITEMS` | `10000` |
| `UI_COMPILER_COMPILE_TIMEOUT_MS` | `10000` |
| `UI_COMPILER_MODEL_TIMEOUT_MS` | `10000` |
| `UI_COMPILER_MODEL_RETRY_COUNT` | `0` |
| `UI_COMPILER_SHUTDOWN_GRACE_MS` | `30000` |

`SIGINT` 和 `SIGTERM` 会停止接收新的业务请求，关闭空闲连接并等待在途 HTTP 请求完成。

## Docker

从仓库根目录构建镜像。

```powershell
docker build -f apps/ui-compiler-service/Dockerfile -t ui-compiler-service:test .
docker run --rm -p 3000:3000 ui-compiler-service:test
```

镜像以 Node 内置 `node` 非特权用户运行。

构建阶段使用锁文件并将仅生产依赖部署到最终镜像。

镜像不复制 `.git`、本地依赖、构建产物或 `.env` 文件。

## HTTP 冒烟

```powershell
Invoke-RestMethod http://127.0.0.1:3000/health
Invoke-RestMethod http://127.0.0.1:3000/version
Invoke-RestMethod -Method Post -Uri http://127.0.0.1:3000/api/ui-compiler/present -ContentType application/json -Body '{"requestId":"smoke-1","content":{"contentType":"markdown","markdown":"# hello"},"catalog":{"catalogId":"test","catalogVersion":"1.0.0"}}'
```

结构化数据请求可在内置测试组装下返回 `generative-ui` 判别联合。

该服务不提供 AG-UI、SSE 或 WebSocket Endpoint。
