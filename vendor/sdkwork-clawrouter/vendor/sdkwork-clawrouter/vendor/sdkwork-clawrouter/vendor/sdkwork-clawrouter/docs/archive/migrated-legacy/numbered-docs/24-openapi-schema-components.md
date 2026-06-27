# OpenAPI Schema Components

`tools.openapi_component_generator` generates reusable OpenAPI component
schemas from the Schema Registry. The output is shared by app/backend OpenAPI
spec generation, SDK validation, and frontend contract checks.

## Output

The generated file lives at:

```text
generated/openapi/schema-components.yaml
```

Generate it with:

```bash
python -B -m tools.openapi_component_generator
```

Check that the committed file is current:

```bash
python -B -m tools.openapi_component_generator --check
```

Expected success output:

```text
OpenAPI schema components are current
```

Focused tests:

```bash
python -B -m unittest tests.test_openapi_component_generator
```

## Type Mapping

| Registry type | OpenAPI schema |
| --- | --- |
| `string(n)` | `type: string`, `maxLength: n` |
| `text` | `type: string` |
| `json` | `type: object`, `additionalProperties: true` |
| `bool` | `type: boolean` |
| `int32` | `type: integer`, `format: int32` |
| `enum_int32` | `type: string`, `x-db-type: enum_int32` |
| `int64` | `type: string`, `format: int64` |
| `decimal` | `type: string`, `format: decimal` |
| `instant` | `type: string`, `format: date-time` |
| `date` | `type: string`, `format: date` |

`int64` and `decimal` are serialized as strings to avoid JavaScript precision
loss. `enum_int32` is exposed as a string while preserving the database storage
hint through `x-db-type`.

## Required Fields

Registry `not_null_columns` are emitted as OpenAPI `required` fields when the
column also exists in the component `properties`. Physical Java-owned columns
declared only in `physical_columns` are not exposed in logical API components.

This keeps generated OpenAPI contracts strict for logical API models while
avoiding accidental exposure of production-only Java table columns.

## Metadata

Every component includes:

- `x-table`
- `x-domain`
- `x-generated-by-this-project`

These fields let downstream tools trace DTOs back to the Schema Registry table
and enforce surface-specific SDK or frontend contracts.
