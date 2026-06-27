# Schema Guardian 标准质量门禁

## 目标

`tools.schema_guardian` 将数据设计中的关键约束固化为可执行校验，作为 `sdkwork-clawrouter` 后续数据库、API、Entity、DTO、OpenAPI 和 SDK 生成前的第一道质量门禁。

当前门禁优先覆盖以下高风险规则：

- Java Entity first：用户、账户、VIP、优惠券、订单、支付、退款、发票等 Java 已有领域必须优先复用 `legacy-java-plus-entity` 的 `plus_*` 物理表。
- L0 legacy contract：被 `legacy_java_contracts.finance_and_trade` 声明的表必须保持 `L0`、`legacy`、`legacy-java-plus-entity` 写入所有权，并且不得由本项目生成替代表结构。
- 禁止同义领域表：不得新增 `commerce_order`、`router_payment`、`sdkwork_account` 等会替代 Java 既有领域的同义表。
- SkillsHub 对齐 Java AgentSkills：不得继续使用 `studio_skill_listing`、`studio_skill_version`、`studio_skill_media` 承载 SkillsHub，必须使用 `plus_agent_skill`、`plus_agent_skill_package`、`plus_user_agent_skill`、`plus_category`。
- Java 实体存在性校验：注册表里声明的 Java 实体必须能在真实工程或测试工程的 `legacy-java-plus-entity/src/main/java` 下找到。
- 统一领域名称：`ModelVendor`、`BillingMeter` 等需要持久化的领域名必须有注册表表定义，并具备 Java/Rust/TypeScript/OpenAPI 类型绑定。
- 多模态计费：`BillingMode`、`BillingMeter` 必须覆盖 LLM、图片、音频、视频、音效、API 按次、API 按结果、API 按个数等计费维度。
- 定价方案：禁止退化为 `ai_pricing_group`，统一使用 `ai_pricing_plan`、`ai_pricing_plan_binding`、`ai_pricing_rule`、`ai_pricing_tier` 组合，支持官方价、供应商成本价、客户销售价、倍率、表达式和阶梯。
- API Key 分组：`iam_gateway_api_key` 必须能绑定 `ai_channel_group`，分组必须能选择 `ai_pricing_plan`，并允许通过 `ai_pricing_plan_binding` 扩展到 API Key、分组、VIP、租户、用户等主体。
- API 路径标准：`api_prefixes.app` 必须是 `/app/v3/api`，`api_prefixes.backend` 必须是 `/backend/v3/api`，OpenAI 兼容面必须是 `/v1`。
- 前端路由覆盖：`/admin/*` 页面必须声明 `backend` API surface，非 `/admin/*` 页面必须声明 `app` API surface，确保 admin 与 console/public 可以按 Java app/backend 标准自由切换。
- 命名标准：非 legacy 新表不得使用 `claw_`、`router_`、`sdkwork_`、`console_`、`admin_`、`portal_` 等产品名或部署名前缀。

## 运行方式

在 `apps/sdkwork-clawrouter` 目录下执行：

统一门禁：

```bash
python -B -m tools.schema_quality_gate
```

成功输出：

```text
Schema quality gate passed
```

单项 Schema Guardian：

```bash
python -B -m tools.schema_guardian
```

成功输出：

```text
Schema guardian passed
```

单元测试：

```bash
python -B -m unittest tests.test_schema_guardian
```

DDL 生成链路应配合以下命令一起作为数据标准门禁：

```bash
python -B -m tools.schema_compiler --check
```

统一领域类型生成链路也应纳入同一门禁：

```bash
python -B -m tools.domain_type_generator --check
```

Schema Manifest 生成链路同样纳入统一门禁：

```bash
python -B -m tools.schema_manifest --check
```

OpenAPI component schema 生成链路也纳入统一门禁：

```bash
python -B -m tools.openapi_component_generator --check
```

## 校验范围

默认校验文件：

```text
docs/schema-registry/sdkwork-clawrouter.tables.yaml
```

默认支持两类 Java 实体路径：

- 测试夹具：`<root>/legacy-java-plus-entity/src/main/java`
- 当前仓库：`<legacy-java-plus-workspace>/legacy-java-plus-entity/src/main/java`

## 后续扩展方向

下一阶段应继续把以下规则纳入可执行门禁：

- 敏感表是否声明审计、脱敏、留存周期、幂等键和唯一索引。
- Schema Registry 到 DDL、Entity、DTO、OpenAPI 的生成产物是否一致。
