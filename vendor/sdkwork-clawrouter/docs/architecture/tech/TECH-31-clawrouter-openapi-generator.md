> Migrated from `docs/31-clawrouter-openapi-generator.md` on 2026-06-24.
> Owner: SDKWork maintainers

`tools.clawrouter_openapi_generator` generates the published app and backend
OpenAPI specifications from `generated/api/api-contract-manifest.json`.

## Outputs

```text
generated/openapi/clawrouter-app-openapi.json
generated/openapi/clawrouter-backend-openapi.json
```

Generate:

```bash
python -B -m tools.clawrouter_openapi_generator
```

Check:

```bash
python -B -m tools.clawrouter_openapi_generator --check
```

Expected success output:

```text
ClawRouter OpenAPI specs are current
```

Focused tests:

```bash
python -B -m unittest tests.test_clawrouter_openapi_generator
python -B -m unittest tests.test_clawrouter_openapi_precision_audit
```

## Component Merge Rule

The final app/backend specs include two component groups:

- runtime wrapper schemas owned by this generator: `PlusApiResult`,
  `OperationRequest`, `OperationResponse`, `PageResult`, and `ErrorResponse`
- Schema Registry record schemas loaded from
  `generated/openapi/schema-components.yaml`

Runtime wrapper schemas take precedence on name conflicts. Schema Registry
record schemas carry table metadata and strict field contracts such as OpenAPI
`required` fields derived from `not_null_columns`.

This keeps the published OpenAPI specs aligned with production schema contracts
while preserving the generic operation request/response wrappers used by the
current Rust route scaffolding.

## Operation Response Precision

The generator creates operation-specific result wrappers when the API contract is
precise enough to do so safely:

- the operation is a `GET`
- `read_sources` contains exactly one table
- the merged schema components contain the matching `{TableName}Record` schema

For these operations the `200` response references `{OperationId}Result`.
`{OperationId}Result.data` is:

- the record schema when the route has path parameters
- an array of the record schema when the route has no path parameters

Operations with multiple read sources, write operations, or missing record
schemas continue to use the generic `PlusApiResult` wrapper. This avoids
overstating request/response DTO precision before the manifest carries enough
operation-specific payload metadata.

## Response Precision Audit

`tools.clawrouter_openapi_precision_audit` validates the published app/backend
OpenAPI JSON files independently from the generator output comparison. The audit
loads three sources of truth:

- `generated/api/api-contract-manifest.json`
- `generated/openapi/schema-components.yaml`
- `generated/openapi/clawrouter-app-openapi.json` and
  `generated/openapi/clawrouter-backend-openapi.json`

It rejects any operation-specific `{OperationId}Result` wrapper unless the
operation is a safe single-table `GET` with an existing `{TableName}Record`
component. It also validates the response shape:

- `GET` routes with path parameters return one record in `data`
- `GET` routes without path parameters return an array of records in `data`
- non-GET operations, multi-source reads, and operations without record
  components must return `PlusApiResult`

Run it directly:

```bash
python -B -m tools.clawrouter_openapi_precision_audit
```

Expected success output:

```text
ClawRouter OpenAPI precision audit passed
```

## Quality Gate

`tools.schema_quality_gate` runs this generator in `--check` mode and then runs
the response precision audit. Any change to the API contract manifest or shared
schema components that affects the final app or backend OpenAPI specs must
regenerate both JSON files before the gate passes, and the resulting response
wrappers must still satisfy the precision rules above.

