> Migrated from `docs/21-schema-compiler-postgres-ddl.md` on 2026-06-24.
> Owner: SDKWork maintainers

## 目标

`tools.schema_compiler` 将 `docs/schema-registry/sdkwork-clawrouter.tables.yaml` 编译为可落库的 PostgreSQL DDL，形成从“数据契约”到“物理表结构”的标准生成链路。

生成产物：

```text
generated/schema/postgres/schema.sql
```

该文件由 Schema Registry 生成，不应手工维护。需要调整表、字段、索引、公共列时，应先修改 Schema Registry，再重新生成。

## 运行命令

生成 DDL：

```bash
python -B -m tools.schema_compiler
```

校验 DDL 是否与 Schema Registry 保持一致：

```bash
python -B -m tools.schema_compiler --check
```

成功输出：

```text
PostgreSQL schema is current
```

单元测试：

```bash
python -B -m unittest tests.test_schema_compiler
```

## 生成边界

生成器只生成本项目负责的新增表。

以下表不会由本项目生成：

- `generated_by_this_project: false` 的 Java-owned legacy 表。
- 用户、账户、VIP、优惠券、订单、支付、退款、发票、AppCenter、SkillsHub 等已经由 `legacy-java-plus-entity` 承担物理结构所有权的 `plus_*` 表。

这些表仍然保留在 Schema Registry 中，用于 API、前端页面、数据依赖、兼容契约和质量门禁，但物理 DDL 应来自 Java 既有实体与迁移体系。

## 类型映射

| Registry 类型 | PostgreSQL 类型 |
| --- | --- |
| `string(n)` | `VARCHAR(n)` |
| `text` | `TEXT` |
| `json` | `JSONB` |
| `bool` | `BOOLEAN` |
| `int32` | `INTEGER` |
| `enum_int32` | `INTEGER` |
| `int64` | `BIGINT` |
| `decimal` | `NUMERIC(38, 12)` |
| `instant` | `TIMESTAMPTZ` |
| `date` | `DATE` |

未知类型会直接失败，不做猜测性降级，避免隐性技术债。

## 公共列

`common_columns` 会按 `schema_registry.common_column_groups` 展开，并使用编译器内置的物理列定义，例如：

- `id BIGINT NOT NULL PRIMARY KEY`
- `uuid VARCHAR(64) NOT NULL`
- `status INTEGER NOT NULL DEFAULT 1`
- `created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP`
- `updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP`
- `metadata JSONB NOT NULL DEFAULT '{}'::jsonb`

如公共列组包含编译器尚不认识的列，编译会失败，必须显式补齐映射。

## 索引

Schema Registry 中的 `indexes` 会生成：

- `CREATE UNIQUE INDEX IF NOT EXISTS ...`，当 `unique: true`。
- `CREATE INDEX IF NOT EXISTS ...`，默认普通索引。

索引名、表名、字段名均使用严格小写 snake_case 白名单校验，避免生成不可控 SQL。

## 当前生成结果

截至当前 Schema Registry：

- 本项目负责生成的新表：67 张。
- 生成索引：150 个。
- Java-owned `plus_*` 表未重复生成。

