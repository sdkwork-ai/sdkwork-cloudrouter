> Migrated from `docs/22-domain-type-generator.md` on 2026-06-24.
> Owner: SDKWork maintainers

## 目标

`tools.domain_type_generator` 从 Schema Registry 的 `domain_names` 生成 Java、Rust、TypeScript 和 OpenAPI 领域类型定义，避免 `ModelVendor`、`BillingMeter` 等核心枚举在多端手工维护后发生漂移。

生成产物：

```text
generated/types/java/**
generated/types/rust/domain.rs
generated/types/typescript/domain-types.ts
generated/types/openapi/domain-types.yaml
```

## 运行命令

生成类型：

```bash
python -B -m tools.domain_type_generator
```

校验生成类型是否与 Schema Registry 保持一致：

```bash
python -B -m tools.domain_type_generator --check
```

成功输出：

```text
Generated domain types are current
```

单元测试：

```bash
python -B -m unittest tests.test_domain_type_generator
```

## 设计原则

- 数据库持久化使用稳定字符串 code，不使用 enum ordinal。
- Java enum 提供 `getCode()` 和 `fromCode(String code)`。
- Rust enum 提供 `code()` 和 `from_code(code: &str)`。
- TypeScript 输出 `as const` 值列表和 union type。
- OpenAPI 输出 `type: string` 和 `enum` 列表。
- 具备跨语言 `type_bindings` 的领域类型必须包含 `unknown`，未知 code 统一映射到 `UNKNOWN/Unknown`。

## 当前覆盖

当前 Schema Registry 已生成：

- `ModelVendor`：模型厂家定义，持久化表为 `ai_model_vendor`。
- `BillingMeter`：计费计量维度，持久化表为 `ai_billing_meter`，覆盖 LLM、图片、音频、视频、音效、API 请求、API 结果、API 条目、工具调用、存储和带宽等维度。

## 后续扩展

后续如需生成 `BillingMode`、`PriceSide`、`PricingPlan` 等类型，应先在 `domain_names` 中补齐：

- `canonical_name`
- `type_bindings.java`
- `type_bindings.rust`
- `type_bindings.typescript`
- `type_bindings.openapi`
- `builtin_values`
- `unknown`

补齐后运行生成器即可产出多端一致类型。

