# 商业化中转站发布 Runbook（sdkwork-cloudrouter）

本文件是 `COMMERCIAL-RELAY-ROUTING-AUDIT-2026-11-22.md` 的配套发布手册。
所有命令都取自仓库真实入口；标注 **[目标环境]** 的步骤必须在预发/生产执行，
本地无法替代。

---

## 1. 前提与范围

- 服务入口：`sdkwork-cloudrouter-standalone-gateway`（网关）、
  `sdkwork-cloudrouter-edge-runtime`（边缘运行时）、
  `sdkwork-cloudrouter-admin-gateway`（后台管理）。
- 部署入口（`bin/README.md`）：`bin/docker-image.sh`、`bin/docker-deploy.sh`、
  `bin/apps-build.sh`、`bin/apps-package.sh`、`bin/doctor.sh`、`bin/backup.sh`。
- 环境与管理端口：development `3950` / test `3951` / staging `3952` /
  demo `3954` / production `3953`。
- 路由数据全部来自数据库快照（15s 刷新）。发布后无需重启即可让
  `ai_upstream_*` / `ai_model_*` / `pricing_*` 的变更生效。

## 2. 发布前配置清单

| 配置 | 用途 | 缺失后果 |
|---|---|---|
| `SDKWORK_CLOUDROUTER_API_KEY_PEPPER`（≥32 字符） | API Key HMAC 哈希 | 启动失败 |
| `SDKWORK_CLOUDROUTER_API_KEY_HASH_PREVIOUS_PEPPERS`（可选，逗号分隔） | 轮换期间旧 Key 仍可鉴权 | 轮换即全量 401 |
| `SDKWORK_CLOUDROUTER_UPSTREAM_CREDENTIAL_KEY_RING` + active key id | 上游凭据加密 | 凭据无法解密 |
| `SDKWORK_CLOUDROUTER_DATABASE_URL`（或运行时 TOML 等价项） | 目录快照与计费 | 启动失败 / 503 |
| Redis 连接（可选但商用必开） | 分布式熔断、幂等、租户并发 | 退化为单节点本地熔断 |
| Provider adapter manifest 路径（如启用内部 adapter） | provider adapter 路由 | 启动即 ERROR |
| `SDKWORK_CLOUDROUTER_UPSTREAM_BASE_URL_ALLOW_LOOPBACK`（可选，仅本地/预发） | 允许 `http://127.0.0.1` 等回环上游（vLLM/Ollama/e2e mock） | 回环明文 Base URL 被写入门禁拒绝；公网明文始终拒绝 |

> 检查：`bin/doctor.sh`，以及在目标机上 `printenv | grep SDKWORK_CLOUDROUTER`。

## 3. 构建与测试门禁

```sh
# 编译门禁（两 crate 必须 exit 0）
cargo check -p sdkwork-cloudrouter-router-service -p sdkwork-cloudrouter-edge-runtime

# 单元/集成门禁（截至本次审计的期望值；数字随树演进而增长，跑完核对 0 失败）
cargo test -p sdkwork-cloudrouter-router-service --lib                # 791 passed
cargo test -p sdkwork-cloudrouter-edge-runtime  --lib                 # 113 passed
cargo test -p sdkwork-cloudrouter-router-service --test api_key_authentication_ring      # 3
cargo test -p sdkwork-cloudrouter-router-service --test billing_missing_usage_estimate   # 2
cargo test -p sdkwork-cloudrouter-router-service --test openai_chat_api                  # 42
cargo test -p sdkwork-cloudrouter-edge-runtime  --test invocation_router                 # 29
cargo test -p sdkwork-cloudrouter-edge-runtime  --test openai_chat_route                 # 3
# 计费全量（37 个套件，0 失败）
for t in $(ls services/sdkwork-cloudrouter-router-service/tests/ | grep '^billing.*\.rs$' | sed 's/\.rs$//'); do
  cargo test -p sdkwork-cloudrouter-router-service --test "$t" || echo "FAIL $t"
done

# 数据库契约/路由 e2e：必须串行（同一 binary 内的用例共享 schema）
export SDKWORK_DATABASE_URL="postgres://<user>:<pass>@<host>:5432/<db>"
for t in postgres_upstream_routing_migration postgres_pricing_integrity_migration \
         postgres_pricing_catalog_loader postgres_upstream_credential_rotation_sql_contract \
         postgres_api_key_command_store_sql_contract postgres_admin_upstream_store \
         postgres_soft_delete_active_unique postgres_app_routing_read_store \
         postgres_openai_invocation_telemetry_plugin postgres_runtime_invocation_reaper \
         postgres_usage_settlement_store_e2e postgres_responses_resource_routing_e2e \
         postgres_chat_completion_routing_e2e; do
  cargo test -p sdkwork-cloudrouter-router-service --test "$t" -- --test-threads=1 \
    || echo "FAIL $t"
done

# Redis 背压/熔断 Lua（一次性实例即可）
export SDKWORK_TEST_REDIS_URL="redis://<host>:6379/0"
cargo test -p sdkwork-cloudrouter-router-service --lib redis
cargo test -p sdkwork-cloudrouter-router-service --lib circuit_breaker
```

构建产物：`bin/apps-build.sh`（cargo release）→ `bin/apps-package.sh`
（`target/bin-packages/` + `.sha256`）。

## 4. 数据库与数据校验 [目标环境]

只读校验（发布前与发布后各跑一次）：

```sql
-- ① 至少一个启用账号：本次生产事故的直接根因（0 个 → 启动期路由为空 → 503/501）
SELECT count(*) AS enabled_accounts
FROM ai_upstream_account WHERE status = 1 AND deleted_at IS NULL;

-- ② official | relay 分布（中转站两侧供应商是否就位）
SELECT supplier_type, count(*) FROM ai_upstream_supplier
WHERE deleted_at IS NULL GROUP BY supplier_type;

-- ③ 采购成本价：least_cost 真实比价的前提（0 行时退化为既有排序）
SELECT price_side, count(*) FROM pricing_price_book
WHERE deleted_at IS NULL GROUP BY price_side;

-- ④ 粘性绑定新写入必须带 expires_at（滑动 7 天）；历史 NULL 行不阻断
SELECT count(*) AS active_without_expiry
FROM ai_upstream_object_route
WHERE deleted_at IS NULL AND status = 1 AND expires_at IS NULL;

-- ⑤ API Key 密文环：应存在 key id
SELECT count(*) AS keys_with_ciphertext_key_id
FROM iam_gateway_api_key WHERE key_secret_key_id IS NOT NULL;
```

目录导入（生成模型/定价目录；必须在部署 schema 环境执行）：

```sh
# 裸测试库会失败：运行时 ID 分配器要求显式 search_path（
# "no schema has been selected to create in"），这也是它只能在 installer
# 准备好的部署环境里运行的原因。
cloudrouterctl refresh-catalog --source official
```

数据库契约测试（需真实库，且必须串行）：

```sh
cargo test -p sdkwork-cloudrouter-router-service --test postgres_upstream_routing_migration
cargo test -p sdkwork-cloudrouter-router-service --test postgres_api_key_command_store_sql_contract
cargo test -p sdkwork-cloudrouter-router-service --test postgres_admin_upstream_store
```

## 5. 发布

```sh
# 1) 构建镜像（版本取 agent.app.config.json release.currentVersion）
bin/docker-image.sh build

# 2) 预发验证
bin/docker-deploy.sh install --environment staging
bin/docker-deploy.sh status  --environment staging
bin/docker-deploy.sh logs    --environment staging

# 3) 生产（必须显式 --yes）
bin/docker-deploy.sh install --environment production --yes
```

审计后的行为变化，发布说明里必须写清：

1. 转发通道缺失 → **503**（原 501），错误码 `provider_relay_not_configured`；
2. 路由类失败统一 **503**（原 502），上游故障仍 502；
3. relay 不再自动重放 5xx POST（仅 429 可重放）；
4. 后台写入拒绝 `http://` / IP 字面量 / 带 userinfo 的 Base URL；
5. 幂等等待窗口 ~1s → **10s**（上限受 in-progress 租约 120s 约束）；
6. 429 计入**独立**熔断计数（阈值 3、冷却 15s），不再占用故障阈值；
7. 客户端 `Idempotency-Key` 不再透传上游（网关终止）。

## 6. 发布后验证 [目标环境]

```sh
# 健康与就绪
curl -fsS http://<host>:<management-port>/healthz
curl -fsS http://<host>:<management-port>/readyz

# 路由解释（逐账号组）：确认候选、定价、供应商类型
curl -fsS -X POST http://<host>:3953/backend/v3/api/ai/upstream_account_groups/<id>/route_explain \
  -H 'content-type: application/json' -d '{"model":"<catalog-key>"}'

# 端到端冒烟（含流式）
curl -sS -X POST http://<host>:<gateway-port>/v1/chat/completions \
  -H "authorization: Bearer $SDKWORK_TEST_KEY" -H 'content-type: application/json' \
  -d '{"model":"gpt-4o-mini","messages":[{"role":"user","content":"ping"}]}'
curl -sS -N -X POST http://<host>:<gateway-port>/v1/chat/completions \
  -H "authorization: Bearer $SDKWORK_TEST_KEY" -H 'content-type: application/json' \
  -d '{"model":"gpt-4o-mini","stream":true,"messages":[{"role":"user","content":"ping"}]}'
```

发布后 30 分钟内观察：

| 指标 | 期望 |
|---|---|
| `/healthz`、`/readyz` | 200 |
| 5xx 比例 | 无持续性 503 `upstream route snapshot is empty` |
| 启动日志 | 无 `callable_upstream_account_routes=0` 的 ERROR |
| 流式 | 首帧 < 30s；长流不被 30s 截断 |
| 取消计费 | 客户端断开后 usage 事实仍落库（partial_usage 非空） |
| 429 | 触发后账号 15s 冷却，无跨模型误伤 |
| 指标 | 无 adapter 4xx/5xx 被计为 2xx |

## 7. 回滚

```sh
# 回到上一个成功版本（ledger 驱动）
bin/docker-deploy.sh rollback --environment production
# 指定版本
bin/docker-deploy.sh rollback --environment production --to <old-version>
# 历史
bash release.sh history --environment production   # 在目标 bundle 内执行
```

回滚不撤销数据库写入。若曾执行第 8 节的密钥轮换，回滚后仍需保留
`..._HASH_PREVIOUS_PEPPERS`，否则旧 Key 会立刻失效。

## 8. 密钥轮换作业（本次审计新增能力）

**API Key pepper 轮换（不停机）**

1. 把当前 pepper 追加到 `SDKWORK_CLOUDROUTER_API_KEY_HASH_PREVIOUS_PEPPERS`；
2. 替换 `SDKWORK_CLOUDROUTER_API_KEY_PEPPER` 为新值，滚动重启；
3. 旧 Key 继续鉴权（哈希 ring 探测）、管理面继续可显示原始 Key（密文 ring）；
4. 存量 Key 全部重签后，清空退役列表。

**上游凭据 ring**：`SDKWORK_CLOUDROUTER_UPSTREAM_CREDENTIAL_KEY_RING` 支持
`activeKeyId` + 历史密钥，轮换时把旧密钥留在 ring 内即可。

## 9. 已知风险与待办（发布不阻塞，但需排期）

1. **采购成本价为空**：`pricing_price_book` 的 `upstream_cost` 侧 0 行时
   `least_cost` 退化为既有排序；需要业务成本数据后导入。
2. **Redis Lua 的 429 冷却**：本轮以契约测试钉住脚本语义，需在集成环境用真实
   Redis 复验（`open_for` 字段与独立 streak）。
3. **性能优化项**（非缺陷）：定价解析请求内 memo + `visible_model_prices` 索引、
   `list_upstream_account_routes` 返回 `Arc`（消费者在 `sdkwork-models`，跨仓）。
4. **模型映射规则后台 CRUD**：`ai_model_mapping_rule` 目前靠种子/脚本维护。
5. **并发写入者**：本会话期间另有写入者在同一 crate 开发功能；发布前必须在
   写入停止后复跑第 3 节全部门禁。
