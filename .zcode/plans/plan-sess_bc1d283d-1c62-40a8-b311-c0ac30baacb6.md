## 目标
API Key 支持**明文/密文两种存储模式(默认明文)**,列表/详情返回明文 key,表格 cell 点击复制。

## 现状约束(已确认)
- 后端只存 `key_hash`(HMAC-SHA256 + pepper),明文仅创建时返回一次;`AppApiKeyItem` 列表契约只有 `maskedKey`
- 已有可复用设施:`ApiKeySecurityConfig`(pepper,强制要求)、`RingAeadCredentialSecretCodec`(AES-256-GCM + KDF 模式)、`HmacSha256ApiKeySecretHasher`
- SDK 链:`apis/...openapi.json` → `@sdkwork/clawrouter-app-sdk`(生成物)→ console-core/sdk → 前端

## 实施方案

### 1. 配置(sdkwork-claw-config `api_key.rs`)
- `ApiKeySecurityConfig` 增加 `secret_storage_mode: ApiKeySecretStorageMode`(Plaintext 默认 | Ciphertext)
- 环境变量 `SDKWORK_CLAW_API_KEY_SECRET_STORAGE=plaintext|ciphertext`,默认 `plaintext`;ciphertext 模式 AEAD 密钥由现有 `SDKWORK_CLAW_API_KEY_PEPPER` 经领域分离 KDF 派生

### 2. 数据库(clawrouter 模块)
- 基线 DDL `0001_clawrouter_baseline.sql` + 新迁移 `0008_add_api_key_secret_storage.up.sql`,给 `iam_gateway_api_key` 加列:
  - `key_secret_mode VARCHAR(16) NOT NULL DEFAULT 'plaintext'`
  - `key_secret_plaintext TEXT`(明文模式存储)
  - `key_secret_ciphertext TEXT` + `key_secret_key_id VARCHAR(64)`(密文模式存储)
- 运行 `pnpm db:materialize:contract` 重新生成 `database/contract/schema.yaml`

### 3. 加密设施(router-service `infrastructure/crypto.rs`)
- 新增 `ApiKeySecretCodec` trait + `RingAeadApiKeySecretCodec`(仿照凭据 codec):`encode(context, secret)` / `decode(context, key_id, ciphertext)`,AAD 绑定 (tenant_id, organization_id, api_key_id),KDF 域 `sdkwork-clawrouter:api-key-secret:v1`
- 新增单元测试(往返 + 作用域绑定,仿照凭据 codec 测试)

### 4. 后端读写链路
- 领域(`sdkwork-models` `access.rs`):`GatewayApiKey` 增加 `raw_key: Option<String>`(同步更新构造点:new()、api_key_command_store.rs ×2、app_api_keys.rs merge 函数、row_mapping、相关测试)
- 写入:`CreateGatewayApiKeyCommand` 增加 `raw_key`;`PostgresGatewayApiKeyCommandStore::new(pool, mode, codec)`;`insert_api_key` 按模式存明文/密文;返回的 item 带 raw_key
- 读取:loader 注入 codec;`load_api_keys`/`load_api_keys_paginated` SQL 增加 4 列;loader 对密文行解密并填充 `raw_key`(明文行直通;无存根的旧 key → `None`);`list_gateway_api_keys` 与 `load_snapshot` 共用解密 helper
- 路由装配 `app_api_key_runtime_deps_for_postgres` 传入 mode + codec

### 5. API 响应(app_api_keys.rs)
- `AppApiKeyItemResponse` 增加 `raw_key: Option<String>`(→ `rawKey`),经 `to_item_response` 一处生效:列表/创建/更新/详情全部带明文

### 6. API 契约 + SDK
- 更新 `apis/app-api/clawrouter/clawrouter-app-api.openapi.json`:`AppApiKeyItem` 增加 `rawKey`(nullable string)
- 用 `clawrouter-sdk-generation` skill 重新生成 `@sdkwork/clawrouter-app-sdk`

### 7. 前端
- `apiKeyService.ts`:`ApiKey.rawKey: string | null`,`normalizeApiKey` 读取 nullable
- `ApiKeysView.tsx`:密钥 cell 默认显示 `rawKey ?? maskedKey`(明文优先);整个 cell 可点击复制(复用 `common.actions.copyKey`/`keyCopied` i18n),悬停提示 + 复制成功反馈;旧 key(rawKey 为 null)回退 masked 显示
- `CreateKeyDrawer.tsx` 详情(mode=view):有 rawKey 时显示明文 + 复制按钮
- 更新 `api-key-runtime.test.ts` fixtures

### 8. 测试
- 重写 `app_api_key_list_never_returns_raw_key_material` → 新契约:明文模式列表返回 rawKey;密文模式落库为密文、列表解密返回;无存根旧 key → rawKey null
- 更新两个 `TestApiKeyCommandStore` 测试替身
- 新增 codec 单元测试;新增 SQL contract 断言(insert 含 key_secret 列)

## 验证
- `cargo check/test`:router-service(lib + app_api_keys + contract 测试)、app-api、edge-runtime、standalone-gateway
- `pnpm db:materialize:contract` 后 diff 检查;SDK 重生成后前端 `pnpm typecheck` + `api-key-runtime.test.ts`

## 范围说明
- 管理员(backend)API key 列表不在本次范围(保持 masked);其创建响应本就返回 rawKey
- 旧 key(迁移前创建,无存根)→ rawKey 为 null,前端回退 masked 显示
