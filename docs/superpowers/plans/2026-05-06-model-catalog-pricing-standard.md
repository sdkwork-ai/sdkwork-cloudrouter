# Model Catalog Pricing Standard Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the legacy model catalog with a canonical multimodal AI model and pricing standard shared by Java, Rust, PostgreSQL, OpenAPI, SDKs, and seed data.

**Architecture:** `ai_*` tables become the only model catalog and pricing system. The canonical model table is `ai_model`; gateway/provider/channel mappings live in integration/routing tables. Runtime migrations, generated contracts, Java services, Rust support code, and seed resources are validated by tests that reject legacy model catalog symbols.

**Tech Stack:** Java 21, Spring Boot, Spring Data JPA, PostgreSQL/Flyway SQL, Rust/sqlx test support, Python unittest contract tests, OpenAPI JSON/YAML, TypeScript generated SDK consumers.

---

### Task 1: Contract Guards

**Files:**
- Create: `tests/test_model_catalog_standard_contract.py`
- Modify: `tests/test_clawrouter_openapi_precision_audit.py`

- [ ] Write failing tests that assert runtime migrations, schema registry, generated OpenAPI, generated manifest, and Rust support do not expose legacy model catalog table or DTO symbols.
- [ ] Write failing tests that assert canonical model/pricing tables follow `DATABASE_SPEC.md`: required common columns, UUID unique constraints, non-null tenant and organization scope, soft-delete fields, and tenant-leading indexes.
- [ ] Write failing tests that assert `ai_model_pricing` money and quantity fields use `NUMERIC`, not `DOUBLE PRECISION`, `REAL`, `float`, or `double`.
- [ ] Write failing tests that assert standard meter codes include token/cache/batch/image/audio/video/rerank/tool/storage meters.
- [ ] Run: `python -B -m unittest tests.test_model_catalog_standard_contract`
- [ ] Expected: fail because old tables/components still exist and meters are incomplete.

### Task 2: Runtime PostgreSQL Schema

**Files:**
- Modify: `../../spring-ai-plus-server-application/src/main/resources/database/postgresql/V2__settlement_and_ai_catalog.sql`
- Modify: `../../spring-ai-plus-server-application/src/main/resources/database/postgresql/V3__model_governance_controls.sql`
- Modify: `../../spring-ai-plus-server-application/src/main/resources/database/postgresql/V5__builder_core_and_authoring.sql`
- Modify: `generated/schema/postgres/schema.sql`
- Modify: `docs/schema-registry/sdkwork-clawrouter.tables.yaml`

- [ ] Replace old model catalog DDL with canonical `ai_model_vendor`, `ai_model_family`, `ai_model`, `ai_model_capability`, `ai_billing_meter`, `ai_model_pricing`, `ai_pricing_plan`, `ai_pricing_plan_binding`, `ai_pricing_rule`, `ai_pricing_tier`, `ai_pricing_import_snapshot`, and `ai_model_rank_snapshot`.
- [ ] Apply `DATABASE_SPEC.md` to every canonical table: `uuid NOT NULL`, `tenant_id BIGINT NOT NULL DEFAULT 0`, `organization_id BIGINT NOT NULL DEFAULT 0`, lifecycle and soft-delete fields, UUID unique constraints, and tenant-leading indexes.
- [ ] Add lifecycle, shelf, and routing state columns to `ai_model`.
- [ ] Remove old governance tables or re-express required concepts through canonical capability, pricing, plan, and policy tables.
- [ ] Update builder/conversation comments and foreign-key references to canonical model ids.
- [ ] Run contract tests from Task 1 until schema checks pass.

### Task 3: Seed Data Standard

**Files:**
- Delete: `../../spring-ai-plus-server-application/src/main/resources/data/model/model_info.json`
- Delete: `../../spring-ai-plus-server-application/src/main/resources/data/model/model_price.json`
- Create: `../../spring-ai-plus-server-application/src/main/resources/data/model-catalog/model-catalog-test.json`
- Create: `../../spring-ai-plus-server-application/src/main/resources/data/model-catalog/model-catalog-dev.json`
- Create: `../../spring-ai-plus-server-application/src/main/resources/data/model-catalog/model-catalog-prod.json`
- Create: `../../spring-ai-plus-server-application/src/main/resources/data/model-catalog/model-catalog-demo.json`
- Modify: `../../spring-ai-plus-server-application/src/main/resources/data/bootstrap/install-profile-manifest.json`
- Modify: `../../spring-ai-plus-server-application/src/main/resources/data/bootstrap/bootstrap-manifest*.json`

- [ ] Write failing seed tests for required profile coverage, source evidence, active multimodal rows, retired/downlisted dev examples, and decimal string prices.
- [ ] Add canonical profile seed files.
- [ ] Update bootstrap manifests to reference canonical files only.
- [ ] Remove legacy model seed references.
- [ ] Run: `python -B -m unittest tests.test_model_catalog_standard_contract`

### Task 4: Java Entity And Repository Replacement

**Files:**
- Delete legacy files under the old Java model entity package.
- Delete legacy files under the old Java model repository package.
- Create canonical entity files under `../../legacy-java-plus-entity/src/main/java/com/sdkwork/spring/ai/plus/entity/ai/catalog/`
- Create canonical repository files under `../../legacy-java-plus-repository/src/main/java/com/sdkwork/spring/ai/plus/repository/ai/catalog/`
- Delete legacy compatibility tests under `../../legacy-java-plus-entity/src/test/java/com/sdkwork/spring/ai/plus/entity/`
- Create canonical mapping tests under `../../legacy-java-plus-entity/src/test/java/com/sdkwork/spring/ai/plus/entity/ai/catalog/`

- [ ] Write failing Java mapping tests for canonical table names, decimal fields as `BigDecimal`, and no legacy entities.
- [ ] Implement canonical entities and repositories.
- [ ] Run targeted Maven tests for business entity/repository modules.

### Task 5: Java Service And Bootstrap Replacement

**Files:**
- Delete legacy service files under `../../legacy-java-plus-service/src/main/java/com/sdkwork/spring/ai/plus/service/model/`
- Delete legacy DTO files that only support the old model catalog.
- Create canonical service files under `../../legacy-java-plus-service/src/main/java/com/sdkwork/spring/ai/plus/service/ai/catalog/`
- Update `../../legacy-java-plus-service/src/main/java/com/sdkwork/spring/ai/plus/service/ai/proxy/impl/ModelProxyServiceImpl.java`

- [ ] Write failing service tests for public listing, admin listing, publish/unpublish/deprecate/retire transitions, and effective price resolution.
- [ ] Implement canonical catalog service and pricing service.
- [ ] Implement canonical data initializer for model-catalog profile resources.
- [ ] Update OpenAI-compatible model proxy to read canonical active/routable models.
- [ ] Run targeted Maven tests for business service.

### Task 6: Backend And App API Replacement

**Files:**
- Delete the legacy backend model information controller.
- Delete the legacy backend model pricing controller.
- Delete legacy VO/form files under backend model package.
- Create canonical backend controller/DTO files.
- Modify: `../../legacy-java-plus-app-api/src/main/java/com/sdkwork/ai/gateway/api/app/v3/models/ModelAppApiController.java`
- Modify: `../../legacy-java-plus-app-api/src/main/java/com/sdkwork/ai/gateway/api/app/v3/models/converter/ModelInfoConverter.java`

- [ ] Write failing controller/contract tests proving APIs project canonical rows and reject legacy DTOs.
- [ ] Implement backend admin APIs using canonical services.
- [ ] Implement app API projections for current frontend UI fields without changing UI.
- [ ] Run targeted Maven tests for backend and app API modules.

### Task 7: OpenAPI, Domain Types, And SDK Regeneration

**Files:**
- Modify: `generated/api/api-contract-manifest.json`
- Modify: `generated/openapi/clawrouter-backend-openapi.json`
- Modify: `generated/openapi/clawrouter-app-openapi.json`
- Modify: `generated/openapi/schema-components.yaml`
- Modify: `generated/types/java/com/sdkwork/claw/router/domain/enums/BillingMeter.java`
- Modify: `generated/types/rust/domain.rs`
- Modify: `generated/types/typescript/domain-types.ts`
- Regenerate SDK packages where project tooling requires it.

- [ ] Write failing OpenAPI/domain tests for expanded meter enum and no legacy model DTOs.
- [ ] Update schema registry and run generators.
- [ ] Confirm frontend service source still uses generated SDK clients and no raw HTTP.
- [ ] Run contract generator tests.

### Task 8: Rust Runtime Alignment

**Files:**
- Modify: `crates/sdkwork-claw-test-support/src/lib.rs`
- Modify Rust runtime query modules that read model/pricing data.

- [ ] Write failing Rust tests for canonical tables, expanded meters, lifecycle/shelf/routing filtering, and decimal price strings.
- [ ] Update Rust support schema and seed rows.
- [ ] Update runtime query code to use canonical table columns.
- [ ] Run: `cargo test -p sdkwork-claw-test-support`

### Task 9: Final Verification

**Files:**
- All modified files.

- [ ] Run Python contract tests:
  - `python -B -m unittest tests.test_model_catalog_standard_contract`
  - `python -B -m unittest tests.test_schema_manifest`
  - `python -B -m unittest tests.test_openapi_component_generator`
  - `python -B -m unittest tests.test_clawrouter_openapi_generator`
  - `python -B -m unittest tests.test_api_contract_manifest`
- [ ] Run targeted Maven tests for affected modules.
- [ ] Run Rust tests for affected crates.
- [ ] Run frontend typecheck if generated SDK types changed.
- [ ] Run the legacy model catalog symbol scan and resolve remaining production-contract hits.
