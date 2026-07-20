> Migrated from `docs/09-部署架构设计.md` on 2026-06-24.
> Owner: SDKWork maintainers

# sdkwork-clawrouter 部署架构设计

## 1. 部署目标

`sdkwork-clawrouter` 使用 Rust-first Rust services 支持四种部署方式：

1. `desktop`：本地桌面部署。
2. `server`：服务器部署。
3. `docker`：Docker/Compose 部署。
4. `kubernetes`：K8S 部署。

四种方式共享同一 Rust runtime、同一数据库契约、同一前端构建产物、同一 API path 和同一 generated SDK 标准。差异只能体现在 profile、数据库、缓存、secret backend、实例拓扑和运维工具。

API 自由切换是部署硬约束：

- App API：`/app/v3/api/**`
- Admin API：`/backend/v3/api/**`
- Gateway API：`/v1/**`

部署切换只能改变 base URL，不允许 rewrite resource path。

## 2. 统一配置模型

核心 profile 变量：

```text
SDKWORK_CLAW_DEPLOYMENT_MODE=desktop|server|docker|kubernetes
```

服务监听变量：

```text
SDKWORK_CLAW_GATEWAY_BIND=0.0.0.0:18080
SDKWORK_CLAW_APP_API_BIND=0.0.0.0:18082
SDKWORK_CLAW_ADMIN_API_BIND=0.0.0.0:18081
```

`SDKWORK_CLAW_GATEWAY_BIND`, `SDKWORK_CLAW_APP_API_BIND`, and `SDKWORK_CLAW_ADMIN_API_BIND` are parsed by Rust `RuntimeConfig` and must be valid socket addresses. `SDKWORK_CLAW_DEPLOYMENT_MODE` is validated by the same config boundary; invalid deployment modes or blank bind values fail startup instead of relying on per-service fallback logic.

基础设施变量：

```text
SDKWORK_CLAW_DATABASE_URL
SDKWORK_CLAW_REDIS_URL
SDKWORK_CLAW_SECRET_BACKEND
SDKWORK_CLAW_OBJECT_STORAGE_URL
SDKWORK_CLAW_PUBLIC_BASE_URL
SDKWORK_CLAW_APP_API_BASE_URL
SDKWORK_CLAW_ADMIN_API_BASE_URL
SDKWORK_CLAW_GATEWAY_BASE_URL
```

这些 base URL 只包含 scheme、host、port 和可选 context root，不包含 `/app/v3/api`、`/backend/v3/api` 或 `/v1` 之后的资源路径。

## 3. Profile 矩阵

| Profile | 运行形态 | DB | Cache | Secret | Portal |
| --- | --- | --- | --- | --- | --- |
| `desktop` | 本地二进制/桌面壳 | SQLite | memory/moka | OS keychain/file | embedded/static |
| `server` | 单机或小集群进程 | PostgreSQL | moka/Redis | env/file/KMS | Nginx/Rust static host |
| `docker` | Compose 或单容器组合 | PostgreSQL/SQLite | Redis | Docker secret/env | Nginx/app container |
| `kubernetes` | 多 Deployment | PostgreSQL/cloud DB | Redis/cloud cache | K8S Secret/Vault/KMS | Ingress/CDN |

## 4. desktop 部署

### 4.1 目标

- 个人开发者零门槛启动。
- 支持本地模型、Ollama、远程 provider。
- 支持本地 API key、路由配置、用量查看。
- 可离线运行基础能力。

### 4.2 拓扑

```text
Desktop Shell / local launcher
  -> static portal
  -> sdkwork-clawrouter-router-service
      -> sdkwork-clawrouter-edge-runtime      127.0.0.1:18080
      -> sdkwork-clawrouter-admin-gateway    127.0.0.1:18081
      -> sdkwork-clawrouter-standalone-gateway      127.0.0.1:18082
      -> SQLite
      -> memory/moka cache
      -> OS keychain or encrypted file
```

### 4.3 标准

- 默认只绑定 `127.0.0.1`。
- 默认 SQLite。
- Provider secret 使用 OS keychain 或加密文件。
- 支持配置导出。
- 本地日志默认脱敏。
- 本地 gateway 和 admin/app 端口分离。

## 5. server 部署

### 5.1 目标

- 单机或少量节点。
- 企业私有化、小团队生产。
- PostgreSQL、Redis、Nginx、systemd/进程管理器。

### 5.2 拓扑

```text
Nginx
  -> /                 portal static
  -> /app/v3/api       sdkwork-clawrouter-standalone-gateway
  -> /backend/v3/api   sdkwork-clawrouter-admin-gateway
  -> /v1               sdkwork-clawrouter-edge-runtime

Rust services
  -> PostgreSQL
  -> Redis optional
  -> secret backend
  -> object storage optional
```

### 5.3 标准

- PostgreSQL 为生产推荐数据库。
- Redis 高并发推荐启用。
- 支持备份、恢复、迁移。
- 支持滚动发布短时间双实例。
- Nginx 只做 upstream 转发，不改写路径。

## 6. docker 部署

### 6.1 目标

- 快速试用。
- 私有化标准交付。
- CI/E2E 环境。

### 6.2 Compose 组件

```text
claw-router-gateway
claw-router-app-api
claw-router-admin-api
claw-router-worker
claw-router-portal or nginx
postgres
redis
minio optional
prometheus optional
grafana optional
```

### 6.3 标准

- 镜像不内置密钥。
- 配置通过 env、env file、Docker secret 注入。
- 数据卷独立挂载。
- 数据库迁移显式执行。
- healthcheck 覆盖 gateway、app-api、admin-api、db、redis。
- Compose 入口不做产品路径 rewrite。

## 7. kubernetes 部署

### 7.1 目标

- 高可用。
- 弹性伸缩。
- 多租户 SaaS 或大型企业生产。
- gateway 和控制面独立扩缩容。

### 7.2 推荐拓扑

```text
Ingress
  -> portal-service
  -> app-api-service
  -> admin-api-service
  -> gateway-service

Deployments:
  portal
  sdkwork-clawrouter-standalone-gateway
  sdkwork-clawrouter-admin-gateway
  sdkwork-clawrouter-edge-runtime
  sdkwork-claw-worker

State:
  PostgreSQL / cloud database
  Redis / cloud cache
  Object storage
  K8S Secret / Vault / KMS

Observability:
  Prometheus
  Grafana
  OpenTelemetry Collector
  log backend
```

### 7.3 扩缩容策略

| Deployment | 扩缩容依据 |
| --- | --- |
| `sdkwork-clawrouter-edge-runtime` | QPS、并发、CPU、network、TTFT |
| `sdkwork-clawrouter-standalone-gateway` | console/public 请求量 |
| `sdkwork-clawrouter-admin-gateway` | admin 请求量、后台任务触发 |
| `sdkwork-claw-worker` | outbox backlog、usage finalize delay |
| `portal` | 静态资源流量 |

### 7.4 K8S 标准

- readiness/liveness/startup probes。
- HPA 使用 CPU、RPS、队列长度。
- ConfigMap 管非敏感配置。
- Secret/Vault 管敏感配置。
- Pod 不使用 root。
- Resource requests/limits 必填。
- Ingress 限制 body size 和 timeout。
- gateway 支持长连接和 streaming timeout。
- Ingress 禁止改写 `/app/v3/api/**`、`/backend/v3/api/**`、`/v1/**`。

## 8. 发布流程

标准发布顺序：

1. 生成 schema、OpenAPI component、API contract manifest。
2. 生成或校验 app/backend SDK。
3. 构建 Rust services。
4. 构建 portal。
5. 运行 Python 质量门禁。
6. 运行 Rust test/fmt/clippy。
7. 执行数据库迁移 dry-run。
8. 构建镜像或桌面安装包。
9. 灰度部署。
10. 观测 SLO。
11. 放量。
12. 保留回滚窗口。

## 9. 备份和恢复

desktop：

- SQLite 文件备份。
- secret keychain 导出需要用户确认。
- 支持配置导出。

server/docker：

- PostgreSQL 定期备份。
- Redis 可重建，不作为唯一真值。
- Object storage 独立备份。
- Secret backend 独立治理。

kubernetes：

- 数据库云备份或 operator 备份。
- Secret/Vault 备份。
- 配置快照和 schema 版本留存。
- 灾备演练记录。

## 10. 部署验收

- [ ] 四种 profile 均有启动文档。
- [ ] desktop 默认 localhost。
- [ ] server 可独立运行。
- [ ] docker Compose 一条命令启动。
- [ ] kubernetes 有 Deployment、Service、Ingress、ConfigMap、Secret、HPA、Probe。
- [ ] 四种部署形态只改 base URL，不改 `/app/v3/api`、`/backend/v3/api`、`/v1` 资源路径。
- [ ] 数据库迁移可重复执行。
- [ ] 发布可回滚。
- [ ] 观测指标可见。
- [ ] secret 不进入镜像和 git。

