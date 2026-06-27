> Migrated from `docs/10-API路径一致性与自由切换架构.md` on 2026-06-24.
> Owner: SDKWork maintainers

## 1. 目标

`sdkwork-clawrouter` 必须做到“只切换 base URL，不切换 API 路径、不切换 SDK、不切换 DTO”。同一套前端、同一套生成 SDK、同一套 OpenAPI 契约，必须能在以下目标之间自由切换：

- 本地桌面后端。
- Server 单体后端。
- Docker Compose 后端。
- K8S Cell 后端。
- 中央 `legacy-java-plus-app-api` 服务。
- 中央 `legacy-java-plus-backend-api` 服务。

这要求 claw-router 的 App API 和 Backend API 路径必须与 Java API 标准完全一致。产品名、部署名、门户名不能插入到公共 API 路径里。

## 2. 单一事实来源

| API 面 | Java 常量 | 固定前缀 | 事实来源 |
| --- | --- | --- | --- |
| App API | `com.sdkwork.app.api.ApiPaths.API_PREFIX` | `/app/v3/api` | `legacy-java-plus-app-api` controller + OpenAPI + generated SDK |
| Backend API | `com.sdkwork.backend.api.ApiPaths.API_PREFIX` | `/backend/v3/api` | `legacy-java-plus-backend-api` controller + OpenAPI + generated SDK |
| Gateway API | OpenAI compatible path registry | `/v1/*` | Gateway compatibility contract |

规则：

1. App/Console/Public 的业务接口必须是 `/app/v3/api/{resource-path}`。
2. Admin 的业务接口必须是 `/backend/v3/api/{resource-path}`。
3. `{resource-path}` 必须来自 Java app-api/backend-api 的 controller/OpenAPI 契约。
4. 不允许为了 claw-router 产品名额外加 `/claw-router`、`/router`、`/sdkwork` 这类部署命名空间。
5. 如果 Java API 中不存在所需方法，必须先补齐 Java controller、OpenAPI、SDK，再接入前端；不能在 claw-router 里临时新增一套本地路径。

## 3. 路径组合公式

前端和其它客户端只理解：

```text
effective_url = base_url + java_api_prefix + resource_path
```

示例：

```text
App API:
  base_url=http://127.0.0.1:18080
  java_api_prefix=/app/v3/api
  resource_path=/auth/login
  effective_url=http://127.0.0.1:18080/app/v3/api/auth/sessions

Backend API:
  base_url=https://admin.example.com
  java_api_prefix=/backend/v3/api
  resource_path=/channel/account/list
  effective_url=https://admin.example.com/backend/v3/api/channel/account/list

Gateway API:
  base_url=https://api.example.com
  resource_path=/v1/chat/completions
  effective_url=https://api.example.com/v1/chat/completions
```

切换部署时只改 `base_url`：

| 部署目标 | App base URL | Backend base URL | Gateway base URL |
| --- | --- | --- | --- |
| Desktop | `http://127.0.0.1:{port}` | `http://127.0.0.1:{port}` | `http://127.0.0.1:{gatewayPort}` |
| Server | `https://portal.example.com` | `https://admin.example.com` 或同域 | `https://api.example.com` |
| Docker | `http://localhost:{port}` | `http://localhost:{port}` | `http://localhost:{gatewayPort}` |
| K8S | `https://portal.cell.example.com` | `https://admin.cell.example.com` | `https://api.cell.example.com` |
| 中央 Java 服务 | 现有 app-api 地址 | 现有 backend-api 地址 | 现有 gateway 地址 |

## 4. 自由切换架构

```text
sdkwork-clawrouter-pc
  |
  | generated app SDK / generated backend SDK / OpenAI compatible SDK
  v
Base URL Resolver
  |
  +-- desktop profile  -> local backend, same paths
  +-- server profile   -> server backend, same paths
  +-- docker profile   -> compose ingress, same paths
  +-- k8s profile      -> ingress, same paths
  +-- cloud profile    -> central java app/backend APIs, same paths
```

关键点：

- 前端模块不感知当前部署模式。
- SDK 方法名不因部署模式变化。
- DTO 不因部署模式变化。
- 鉴权 token 存储和刷新策略可以按部署 profile 装配，但请求路径不变。
- Nginx/Ingress 可以做 upstream 选择，但不能 rewrite 掉 `/app/v3/api`、`/backend/v3/api`、`/v1`。

## 5. 三种后端装配模式

| 模式 | 说明 | 路径要求 | 适用 |
| --- | --- | --- | --- |
| Embedded Java API | claw-router 直接装配 app-api/backend-api controller 或等价实现 | 完全相同 | Desktop、Server 单体、Docker |
| Reverse Proxy | claw-router/Ingress 将 Java API 前缀转发到中央 app/backend 服务 | 不重写路径 | K8S、混合部署 |
| Remote SDK Direct | 前端 SDK base URL 直接指向中央 app/backend 服务 | 不经过本地业务 API | 云控制面、本地轻量网关 |

三种模式的业务契约必须一致。差异只在部署拓扑和 base URL resolver。

## 6. Java Controller 约束

新增 App controller：

```java
@RequestMapping(ApiPaths.API_PREFIX + "/{resource}")
```

或使用等价的 `ApiPaths.appPath("/{resource}")` 生成路径。不得写成：

```java
@RequestMapping("/app/v3/api/claw-router/{resource}") // 禁止，除非 Java app-api 本身已经把它定义为标准资源路径
```

新增 Backend controller：

```java
@RequestMapping(ApiPaths.API_PREFIX + "/{resource}")
```

或使用等价的 `ApiPaths.backendPath("/{resource}")` 生成路径。不得写成：

```java
@RequestMapping("/backend/v3/api/claw-router/{resource}") // 禁止，除非 Java backend-api 本身已经把它定义为标准资源路径
```

如果当前历史代码中 controller 暂时手写完整字符串，也必须与 `ApiPaths.API_PREFIX` 保持字面一致，并进入后续统一整改清单。

## 7. 前端调用约束

Public/Console：

- 只使用 `legacy-java-plus-app-api` 生成 SDK 或批准的 app SDK wrapper。
- 不手写 `/app/v3/api/...` raw fetch。
- 不调用 backend API 完成用户侧功能。

Admin：

- 只使用 `legacy-java-plus-backend-api` 生成 SDK 或批准的 backend SDK wrapper。
- 不手写 `/backend/v3/api/...` raw fetch。
- 不调用 app API 完成管理功能。

Gateway/Playground：

- 调用 `/v1/*` 兼容 API。
- 可使用 OpenAI compatible SDK。
- 不包装 `PlusApiResult<T>`。

## 8. 路径注册表

claw-router 必须维护一份路径注册表，来源于 Java OpenAPI，而不是人工维护第二份真值。

注册表至少包含：

```yaml
surface: app
java_prefix: /app/v3/api
resource_path: /api-keys
operation_id: createApiKey
sdk_method: client.apiKeys.create
owner_module: legacy-java-plus-app-api
runtime_modes: [desktop, server, docker, k8s, cloud]
```

```yaml
surface: backend
java_prefix: /backend/v3/api
resource_path: /channel/account
operation_id: listChannelAccounts
sdk_method: client.channelAccount.list
owner_module: legacy-java-plus-backend-api
runtime_modes: [server, docker, k8s, cloud]
```

## 9. CI 校验

发布前必须校验：

1. App API 路径全部以 `/app/v3/api` 开始。
2. Backend API 路径全部以 `/backend/v3/api` 开始。
3. Gateway API 路径全部以 `/v1` 或明确兼容协议前缀开始。
4. claw-router route manifest 与 Java app/backend OpenAPI path 集合一致。
5. 前端源码不存在业务 raw fetch、axios、手写 Authorization、手写 API 前缀。
6. SDK 重新生成后无未提交生成差异。
7. 同一套前端构建产物在 desktop/server/docker/k8s 只通过 base URL 切换通过冒烟测试。

## 10. 验收标准

- [ ] 任意 App API 只要切换 app base URL，就能在本地 claw-router 和中央 `legacy-java-plus-app-api` 之间切换。
- [ ] 任意 Backend API 只要切换 backend base URL，就能在本地/私有化 backend 和中央 `legacy-java-plus-backend-api` 之间切换。
- [ ] 前端无产品级路径分叉。
- [ ] Nginx/Ingress 无破坏 API 前缀的 rewrite。
- [ ] 新增能力必须先进入 Java app-api/backend-api 契约和 SDK。
- [ ] Gateway `/v1/*` 与 App/Backend 控制面严格分离。

