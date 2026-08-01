# 使用教程

本教程假设 Claw Router 已完成初始化并成功启动。

## 1. 访问入口

默认地址：

```text
Portal: http://127.0.0.1:3900/
Gateway API: http://127.0.0.1:3900/v1
Backend/Admin API: http://127.0.0.1:3900/backend/v3/api
App API: http://127.0.0.1:3900/app/v3/api
Gateway OpenAPI: http://127.0.0.1:3900/openapi.json
Admin OpenAPI: http://127.0.0.1:3900/backend/v3/api/openapi.json
App OpenAPI: http://127.0.0.1:3900/app/v3/api/openapi.json
```

健康检查：

```bash
curl http://127.0.0.1:3900/healthz
curl http://127.0.0.1:3900/readyz
```

## 2. 登录和认证方式

`v0.3.0` 支持后台配置登录方式、二维码登录、OAuth 展示、恢复方式、注册方式和验证码策略。

默认策略偏保守：

- 密码登录默认可用。
- 二维码登录、邮箱验证码登录、手机验证码登录、OAuth、session bridge 默认需要显式开启。
- 注册是否需要验证码由 IAM 运行时策略控制。

首次安装或启动会按需初始化 bootstrap 管理员。默认用户名为 `admin`；一次性密码会出现在 installer 输出的 `bootstrapAdmin.initialPassword`，或启动日志的 `initial_password` 中。首次登录后请立即轮换密码，并在后台配置 IAM 策略。

## 3. 管理后台

管理后台路径通常在：

```text
http://127.0.0.1:3900/admin
```

常用模块：

- `/admin/dashboard`：运行概览。
- `/admin/user`：用户和 API key 管理。
- `/admin/group`：分组和策略绑定。
- `/admin/model`：模型目录和发布状态。
- `/admin/upstream`：AI 供应商、账号、账号组、只写凭据生命周期和健康状态。
- `/admin/payments/channels`：支付渠道与支付供应商账号路由。
- `/admin/ratelimit`：限流和风控。
- `/admin/monitor`：实例、心跳和告警。
- `/admin/marketing`、`/admin/finance`：商业化和账务。

## 4. Console 用户侧

用户控制台路径通常在：

```text
http://127.0.0.1:3900/console
```

常用模块：

- `/console/dashboard`：用量和状态。
- `/console/api-keys`：API key。
- `/console/providers`：供应商和模型配置。
- `/console/routing`：路由策略。
- `/console/usage`：调用记录。
- `/console/commerce`、`/console/account`：账务和账户。

## 5. 调用 Gateway API

Gateway 暴露 OpenAI-compatible `/v1/*` 接口。调用示例：

```bash
curl http://127.0.0.1:3900/v1/models \
  -H "Authorization: Bearer <gateway-api-key>"
```

聊天接口示例：

```bash
curl http://127.0.0.1:3900/v1/chat/completions \
  -H "Authorization: Bearer <gateway-api-key>" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "gpt-5.5",
    "messages": [
      {"role": "user", "content": "Hello"}
    ]
  }'
```

实际可用模型、供应商账号、路由策略和计费策略取决于后台配置。

## 6. OpenAPI 和 SDK

OpenAPI：

```text
Gateway: /openapi.json
Admin API: /backend/v3/api/openapi.json
App API: /app/v3/api/openapi.json
```

Portal 构建产物包含预构建 SDK ZIP：

```text
portal/dist/sdk-archives
```

标准预构建包名示例：

```text
sdkwork-clawrouter-app-sdk-typescript-0.1.0.zip
sdkwork-clawrouter-backend-sdk-typescript-0.1.0.zip
```

SDK 包版本独立于 Claw Router release 版本。以 SDK package 自身 `package.json` 版本为准。

## 7. 常见操作顺序

首次部署后：

1. 检查 `/readyz`。
2. 登录 portal。
3. 配置 IAM 登录和注册策略。
4. 配置供应商凭据引用。
5. 配置模型和渠道。
6. 创建或导入用户/API key。
7. 调用 `/v1/models` 验证 gateway。
8. 调用 `/v1/chat/completions` 验证路由和计费记录。

## 8. 运维检查

下面的命令假设 `clawrouterctl` 已在 `PATH` 中。若从 release 包解压目录执行，Linux/macOS 使用 `./bin/clawrouterctl`，Windows 使用 `.\bin\clawrouterctl.exe`。

查看安装状态：

```bash
clawrouterctl status
```

刷新模型目录：

```bash
clawrouterctl refresh-catalog --force
```

查看 readiness：

```bash
curl -i http://127.0.0.1:3900/readyz
```

如果 `/readyz` 失败，优先检查：

- 数据库连接。
- PostgreSQL 权限。
- 模型目录是否刷新成功。
- upstream gateway/admin/app 服务是否可达。
- 反向代理是否正确转发 host、scheme 和路径。
