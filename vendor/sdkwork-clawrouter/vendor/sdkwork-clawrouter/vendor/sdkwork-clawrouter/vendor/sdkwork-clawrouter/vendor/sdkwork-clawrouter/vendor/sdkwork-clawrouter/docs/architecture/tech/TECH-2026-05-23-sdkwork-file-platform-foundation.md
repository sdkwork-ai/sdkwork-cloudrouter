> Migrated from `docs/superpowers/plans/2026-05-23-sdkwork-file-platform-foundation.md` on 2026-06-24.
> Owner: SDKWork maintainers

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the first reusable SDKWork file platform foundation packages: contracts, SDK ports, SDK adapters, and service orchestration for policy-driven uploads, bindings, and usage accounting.

**Architecture:** Phase 1 starts with pure TypeScript common packages so the domain standard, upload client, service API, SDK generation manifest, SDK wrapper adapter, and tests are independent from any UI or storage backend. Contracts define stable file/upload/drive/storage types; ports define generated-SDK-facing backend orchestration interfaces; API contracts define OpenAPI surfaces; the SDK generation manifest defines stable app/backend SDK targets and artifacts; the SDK adapter defines approved generated-SDK wrapper boundaries for app/backend consumers; the upload client implements standard presigned HTTP transfer; service implements deterministic upload session orchestration, slot policy validation, quota reservation, completion, and binding flows through dependency-injected ports.

**Tech Stack:** TypeScript 6, monorepo workspaces via PNPM, Vitest, existing `sdkwork-appbase` common package conventions.

---

## Scope

This plan implements only the foundation layer:

- `@sdkwork/file-contracts`
- `@sdkwork/file-sdk-ports`
- `@sdkwork/file-upload-client`
- `@sdkwork/file-schema`
- `@sdkwork/file-api-contracts`
- `@sdkwork/file-sdk-generation`
- `@sdkwork/file-sdk-adapter`
- `@sdkwork/file-service`
- `@sdkwork/file-upload-pc-react`
- `@sdkwork/file-picker-pc-react`
- `@sdkwork/file-attachments-pc-react`
- `@sdkwork/file-preview-pc-react`
- `@sdkwork/drive-pc-react`
- `@sdkwork/storage-usage-pc-react`
- `@sdkwork/file-platform-pc-react`

It intentionally does not implement Rust storage, S3 clients, OpenAPI
generation, or admin pages in this first execution slice. It does include a
testable database schema catalog and PostgreSQL migration generator so the
storage model, upload ledger, quota reservation, drive tree, and audit rules are
standardized before storage adapters are added. It also includes testable app
and backend OpenAPI contract documents so generated SDKs, RBAC, route naming,
operation ids, and storage-internal API boundaries have one executable source of
truth. It includes an approved SDK adapter boundary that maps semantic generated
SDK wrapper methods into the component-facing file service and backend admin
storage port without raw HTTP, manual auth headers, or local SDK forks. It also
includes a deterministic SDK generation manifest and OpenAPI artifact exporter
for app/backend TypeScript SDK generation. It also includes the first PC React
upload, picker, attachment, preview/download, drive browser, and storage-usage
building blocks because these are the smallest useful business-facing
integration layer on top of the service boundary.

The `sdkwork-appbase` directory in this workspace is a junction whose target is
outside the current writable root. The first foundation packages are therefore
implemented under the current repository's `packages/common/file/*` tree while
preserving the SDKWork appbase package boundaries and naming.

## Files

- Create: `packages/common/file/sdkwork-file-contracts/package.json`
- Create: `packages/common/file/sdkwork-file-contracts/tsconfig.json`
- Create: `packages/common/file/sdkwork-file-contracts/README.md`
- Create: `packages/common/file/sdkwork-file-contracts/src/index.ts`
- Create: `packages/common/file/sdkwork-file-contracts/tests/file-contracts.standard.test.ts`
- Create: `packages/common/file/sdkwork-file-sdk-ports/package.json`
- Create: `packages/common/file/sdkwork-file-sdk-ports/tsconfig.json`
- Create: `packages/common/file/sdkwork-file-sdk-ports/README.md`
- Create: `packages/common/file/sdkwork-file-sdk-ports/src/index.ts`
- Create: `packages/common/file/sdkwork-file-sdk-ports/tests/file-sdk-ports.standard.test.ts`
- Create: `packages/common/file/sdkwork-file-upload-client/package.json`
- Create: `packages/common/file/sdkwork-file-upload-client/tsconfig.json`
- Create: `packages/common/file/sdkwork-file-upload-client/README.md`
- Create: `packages/common/file/sdkwork-file-upload-client/src/index.ts`
- Create: `packages/common/file/sdkwork-file-upload-client/tests/file-upload-client.standard.test.ts`
- Create: `packages/common/file/sdkwork-file-schema/package.json`
- Create: `packages/common/file/sdkwork-file-schema/tsconfig.json`
- Create: `packages/common/file/sdkwork-file-schema/README.md`
- Create: `packages/common/file/sdkwork-file-schema/src/index.ts`
- Create: `packages/common/file/sdkwork-file-schema/tests/file-schema.standard.test.ts`
- Create: `packages/common/file/sdkwork-file-api-contracts/package.json`
- Create: `packages/common/file/sdkwork-file-api-contracts/tsconfig.json`
- Create: `packages/common/file/sdkwork-file-api-contracts/README.md`
- Create: `packages/common/file/sdkwork-file-api-contracts/src/index.ts`
- Create: `packages/common/file/sdkwork-file-api-contracts/tests/file-api-contracts.standard.test.ts`
- Create: `packages/common/file/sdkwork-file-sdk-generation/package.json`
- Create: `packages/common/file/sdkwork-file-sdk-generation/tsconfig.json`
- Create: `packages/common/file/sdkwork-file-sdk-generation/README.md`
- Create: `packages/common/file/sdkwork-file-sdk-generation/src/index.ts`
- Create: `packages/common/file/sdkwork-file-sdk-generation/tests/file-sdk-generation.standard.test.ts`
- Create: `scripts/materialize-file-sdk-artifacts.mjs`
- Create: `sdks/file-app-sdk/.sdkwork-assembly.json`
- Create: `sdks/file-app-sdk/README.md`
- Create: `sdks/file-app-sdk/openapi/file-app-sdk.openapi.json`
- Create: `sdks/file-app-sdk/openapi/file-app-sdk.sdkgen.json`
- Create: `sdks/file-backend-sdk/.sdkwork-assembly.json`
- Create: `sdks/file-backend-sdk/README.md`
- Create: `sdks/file-backend-sdk/openapi/file-backend-sdk.openapi.json`
- Create: `sdks/file-backend-sdk/openapi/file-backend-sdk.sdkgen.json`
- Create: `sdks/file-sdk-generation-manifest.json`
- Create: `packages/common/file/sdkwork-file-sdk-adapter/package.json`
- Create: `packages/common/file/sdkwork-file-sdk-adapter/tsconfig.json`
- Create: `packages/common/file/sdkwork-file-sdk-adapter/README.md`
- Create: `packages/common/file/sdkwork-file-sdk-adapter/src/index.ts`
- Create: `packages/common/file/sdkwork-file-sdk-adapter/tests/file-sdk-adapter.standard.test.ts`
- Create: `packages/common/file/sdkwork-file-service/package.json`
- Create: `packages/common/file/sdkwork-file-service/tsconfig.json`
- Create: `packages/common/file/sdkwork-file-service/README.md`
- Create: `packages/common/file/sdkwork-file-service/src/index.ts`
- Create: `packages/common/file/sdkwork-file-service/tests/file-service.standard.test.ts`
- Create: `packages/pc-react/file/sdkwork-file-upload-pc-react/package.json`
- Create: `packages/pc-react/file/sdkwork-file-upload-pc-react/tsconfig.json`
- Create: `packages/pc-react/file/sdkwork-file-upload-pc-react/vitest.config.ts`
- Create: `packages/pc-react/file/sdkwork-file-upload-pc-react/README.md`
- Create: `packages/pc-react/file/sdkwork-file-upload-pc-react/src/index.tsx`
- Create: `packages/pc-react/file/sdkwork-file-upload-pc-react/tests/file-upload-pc-react.test.tsx`
- Create: `packages/pc-react/file/sdkwork-file-picker-pc-react/package.json`
- Create: `packages/pc-react/file/sdkwork-file-picker-pc-react/tsconfig.json`
- Create: `packages/pc-react/file/sdkwork-file-picker-pc-react/vitest.config.ts`
- Create: `packages/pc-react/file/sdkwork-file-picker-pc-react/README.md`
- Create: `packages/pc-react/file/sdkwork-file-picker-pc-react/src/index.tsx`
- Create: `packages/pc-react/file/sdkwork-file-picker-pc-react/tests/file-picker-pc-react.test.tsx`
- Create: `packages/pc-react/file/sdkwork-file-attachments-pc-react/package.json`
- Create: `packages/pc-react/file/sdkwork-file-attachments-pc-react/tsconfig.json`
- Create: `packages/pc-react/file/sdkwork-file-attachments-pc-react/vitest.config.ts`
- Create: `packages/pc-react/file/sdkwork-file-attachments-pc-react/README.md`
- Create: `packages/pc-react/file/sdkwork-file-attachments-pc-react/src/index.tsx`
- Create: `packages/pc-react/file/sdkwork-file-attachments-pc-react/tests/file-attachments-pc-react.test.tsx`
- Create: `packages/pc-react/file/sdkwork-file-preview-pc-react/package.json`
- Create: `packages/pc-react/file/sdkwork-file-preview-pc-react/tsconfig.json`
- Create: `packages/pc-react/file/sdkwork-file-preview-pc-react/vitest.config.ts`
- Create: `packages/pc-react/file/sdkwork-file-preview-pc-react/README.md`
- Create: `packages/pc-react/file/sdkwork-file-preview-pc-react/src/index.tsx`
- Create: `packages/pc-react/file/sdkwork-file-preview-pc-react/tests/file-preview-pc-react.test.tsx`
- Create: `packages/pc-react/file/sdkwork-drive-pc-react/package.json`
- Create: `packages/pc-react/file/sdkwork-drive-pc-react/tsconfig.json`
- Create: `packages/pc-react/file/sdkwork-drive-pc-react/vitest.config.ts`
- Create: `packages/pc-react/file/sdkwork-drive-pc-react/README.md`
- Create: `packages/pc-react/file/sdkwork-drive-pc-react/src/index.tsx`
- Create: `packages/pc-react/file/sdkwork-drive-pc-react/tests/drive-pc-react.test.tsx`
- Create: `packages/pc-react/file/sdkwork-storage-usage-pc-react/package.json`
- Create: `packages/pc-react/file/sdkwork-storage-usage-pc-react/tsconfig.json`
- Create: `packages/pc-react/file/sdkwork-storage-usage-pc-react/vitest.config.ts`
- Create: `packages/pc-react/file/sdkwork-storage-usage-pc-react/README.md`
- Create: `packages/pc-react/file/sdkwork-storage-usage-pc-react/src/index.tsx`
- Create: `packages/pc-react/file/sdkwork-storage-usage-pc-react/tests/storage-usage-pc-react.test.tsx`
- Create: `packages/pc-react/file/sdkwork-file-platform-pc-react/package.json`
- Create: `packages/pc-react/file/sdkwork-file-platform-pc-react/tsconfig.json`
- Create: `packages/pc-react/file/sdkwork-file-platform-pc-react/vitest.config.ts`
- Create: `packages/pc-react/file/sdkwork-file-platform-pc-react/README.md`
- Create: `packages/pc-react/file/sdkwork-file-platform-pc-react/src/index.ts`
- Create: `packages/pc-react/file/sdkwork-file-platform-pc-react/tests/file-platform-pc-react.test.ts`

## Task 1: Contracts Package

- [ ] Write failing Vitest coverage for table names, API routes, status enums,
      slot definitions, and file-ref rules.
- [ ] Run the contracts test and verify it fails because the package does not
      exist yet.
- [ ] Create `@sdkwork/file-contracts` with canonical constants, types, and
      validators.
- [ ] Include canonical S3-compatible provider types and logical bucket scopes
      so ports, API schemas, and database naming use one vocabulary.
- [ ] Keep canonical operation contracts complete for every app/backend OpenAPI
      operation so route, operation id, tag, surface, and kind never drift.
- [ ] Run contracts tests and package typecheck.

## Task 2: SDK Ports Package

- [ ] Write failing Vitest coverage for upload, binding, access, drive, and
      usage port shapes.
- [ ] Run the ports test and verify it fails because the package does not exist
      yet.
- [ ] Create `@sdkwork/file-sdk-ports` depending only on `@sdkwork/file-contracts`.
- [ ] Include backend admin storage query ports for providers, quotas, current
      usage counters, append-only usage ledger, historical usage snapshots,
      bucket inventory, reconciliation runs, and garbage-collection jobs.
- [ ] Include backend admin storage configuration commands for creating
      providers, logical buckets, and quota policies; each command must carry an
      explicit idempotency key and map through semantic generated SDK wrapper
      methods.
- [ ] Run ports tests and package typecheck.

## Task 3: Service Package

- [ ] Write failing Vitest coverage for upload session creation, slot policy
      rejection, quota reservation, completion, binding creation, and abort.
- [ ] Run the service test and verify it fails because the package does not
      exist yet.
- [ ] Create `@sdkwork/file-service` depending only on `@sdkwork/file-sdk-ports`
      and `@sdkwork/file-contracts`.
- [ ] Run service tests and package typecheck.

## Task 4: Upload Client Package

- [ ] Write failing Vitest coverage for presigned single-part uploads, expired
      grants, HTTP failure normalization, multipart part upload, and standard
      transport selection.
- [ ] Run the upload client test and verify it fails because the package does
      not exist yet.
- [ ] Create `@sdkwork/file-upload-client` depending only on
      `@sdkwork/file-sdk-ports`.
- [ ] Run upload client tests and package typecheck.

## Task 5: Workspace Integration

- [ ] Keep package-level scripts self-contained by pointing to the existing
      `sdkwork-appbase` TypeScript and Vitest toolchain.
- [ ] Run targeted tests for all common file packages.
- [ ] Run targeted typecheck for all common file packages.

## Task 6: PC React Upload Building Block

- [ ] Write failing React tests for a slot-based upload button and queue.
- [ ] Run the upload component test and verify it fails because the component
      implementation does not exist yet.
- [ ] Implement `FileUploadButton`, `FileUploadQueue`, and the presigned upload
      transport boundary.
- [ ] Pass the file service into upload transports so multipart transports can
      request per-part presigned grants through the service.
- [ ] Run upload component tests and package typecheck.

## Task 7: PC React File Picker Building Block

- [ ] Write failing React tests for service-backed file selection and selected
      file reference rendering.
- [ ] Run the picker component test and verify it fails before implementation.
- [ ] Implement `FilePickerDialog` and `FileSelectedList` on top of
      `@sdkwork/file-service`.
- [ ] Run picker component tests and package typecheck.

## Task 8: Storage Usage Contract and PC React Building Block

- [ ] Write failing contract coverage for storage usage scope types and standard
      usage snapshots.
- [ ] Implement canonical storage usage snapshot contracts and wire service/port
      types to that contract.
- [ ] Write failing React tests for `StorageUsageBar` and `StorageQuotaCard`.
- [ ] Implement storage usage display without exposing ledger, provider, bucket,
      object key, or presigned URL internals.
- [ ] Run storage usage component tests and package typecheck.

## Task 9: Drive Contract and PC React Building Block

- [ ] Write failing contract coverage for drive space types, node types, and
      storage-safe drive resources.
- [ ] Implement canonical drive space and drive node contracts.
- [ ] Type `DrivePort` list operations with standard drive resources instead of
      `unknown` lists.
- [ ] Add `listDriveSpaces` and `listDriveNodes` service methods that delegate
      through the drive port.
- [ ] Write failing React tests for drive space tabs, node list, and service
      backed drive browser.
- [ ] Implement `DriveSpaceTabs`, `DriveNodeList`, and `DriveBrowser`.
- [ ] Run drive component tests and package typecheck.

## Task 10: Attachment Binding Service and PC React Building Block

- [ ] Write failing service coverage for listing and deleting file bindings.
- [ ] Implement `listBindings` and `deleteBinding` service methods through the
      binding port.
- [ ] Enforce slot `maxCount` and single-slot cardinality in `bindFile` before
      creating a new binding.
- [ ] Write failing React tests for `FileAttachmentList` and service-backed
      `FileAttachmentManager`.
- [ ] Implement attachment components that expose only stable `FileRef`
      metadata and remove bindings through the service.
- [ ] Run attachment component tests and package typecheck.

## Task 11: File Access Service and PC React Preview Building Block

- [ ] Write failing service coverage for retrieving files and issuing
      short-lived preview/download URLs through access ports.
- [ ] Implement `getFile`, `issuePreviewUrl`, and `issueDownloadUrl` service
      methods as access-port facades.
- [ ] Write failing React tests for `FilePreviewSummary` and
      `FileAccessActions`.
- [ ] Implement preview/download actions that issue URLs on demand and return
      them through callbacks without rendering or persisting them as business
      metadata.
- [ ] Run preview component tests and package typecheck.

## Task 12: Database Schema Standard Package

- [ ] Write failing schema coverage for table catalog alignment, required DDL,
      storage object uniqueness, upload idempotency, multipart part checks,
      drive-node name uniqueness, current file-version uniqueness, usage ledger
      idempotency, usage counter scope uniqueness, append-only audit/ledger
      protection, quota reservation checks, binding indexes, reconciliation and
      garbage-collection governance tables, and durable URL boundary rules.
- [ ] Run the schema test and verify it fails because the schema package does
      not exist yet.
- [ ] Create `@sdkwork/file-schema` with a versioned schema catalog and
      PostgreSQL migration SQL generator, including usage ledger, current
      counters, historical usage snapshots for reporting, reconciliation runs,
      reconciliation findings, and garbage-collection jobs.
- [ ] Enforce canonical provider types, logical bucket scopes, quota policy
      scopes, and usage counter/snapshot scopes as PostgreSQL check constraints
      sourced from `@sdkwork/file-contracts`.
- [ ] Enforce upload mode, drive space type, and drive node type as PostgreSQL
      check constraints sourced from `@sdkwork/file-contracts`, matching the
      OpenAPI enum vocabulary.
- [ ] Run schema tests and package typecheck.

## Task 13: App and Backend API Contract Package

- [ ] Write failing OpenAPI contract coverage for canonical app/backend route
      alignment, operation id uniqueness, backend admin RBAC metadata, app and
      backend authority separation, and storage-internal field boundaries on
      durable app resources.
- [ ] Run the API contract test and verify it fails because the API contract
      package does not exist yet.
- [ ] Create `@sdkwork/file-api-contracts` with app and backend OpenAPI 3.1
      documents derived from canonical route constants.
- [ ] Validate that every OpenAPI operation id exactly matches the canonical
      operation contract set from `@sdkwork/file-contracts`.
- [ ] Derive required OpenAPI `in: path` parameters from every templated route
      segment so generated SDK method signatures stay aligned with canonical
      paths.
- [ ] Define adapter-facing read/list query parameters for request IDs,
      pagination, target filters, usage scopes, bucket scopes, reconciliation
      filters, and usage ledger/snapshot time windows.
- [ ] Define backend storage configuration command request schemas for provider,
      bucket, and quota-policy creation, including required `idempotencyKey` and
      `requestId` fields for generated SDK safety.
- [ ] Bind app upload command operations to explicit request body schemas for
      session creation, multipart part presigning, completion, and abort.
- [ ] Bind app file access URL and file binding command operations to explicit
      request body schemas so generated SDK command inputs stay strongly typed.
- [ ] Bind app upload command `200` responses to explicit JSON schemas so
      generated SDK return values stay strongly typed.
- [ ] Bind foundation read/list operation `200` responses to explicit JSON
      schemas, including app file list/detail, binding list, drive space/node
      list, current usage, and backend storage governance list responses.
- [ ] Return typed backend storage provider, bucket, quota-policy,
      reconciliation-run, and garbage-collection job resource schemas from
      mutation envelopes instead of generic objects.
- [ ] Enforce typed JSON `200` responses for every app/backend operation and a
      JSON request body with `requestId` for every non-GET command operation.
- [ ] Add typed backend governance schemas for admin file, drive permission,
      share-link, file-slot, security scan, DLP, access-log, and audit-log
      operations.
- [ ] Prune each OpenAPI surface to schemas reachable from its own paths so app
      SDK artifacts do not include backend-only admin governance components.
- [ ] Validate that every schema `$ref` left after surface pruning resolves
      inside the same OpenAPI document before SDK artifacts are exported.
- [ ] Reject unbounded OpenAPI object schemas (`additionalProperties: true`)
      and replace storage garbage-collection criteria with a structured schema
      so generated SDK DTOs stay explicit.
- [ ] Bind reusable OpenAPI type fields to canonical enum vocabularies from
      `@sdkwork/file-contracts`, including upload mode, drive node type, drive
      space type, and storage usage scope type.
- [ ] Run API contract tests and package typecheck.

## Task 14: Generated SDK Adapter Boundary Package

- [ ] Write failing adapter coverage for OpenAPI-aligned adapter manifest
      entries, component-facing app service facade calls, backend admin storage
      port calls, and SDK error redaction.
- [ ] Run the SDK adapter test and verify it fails because the adapter package
      does not exist yet.
- [ ] Add missing app API list-files contract coverage needed by the file
      picker and generated SDK wrapper boundary.
- [ ] Create `@sdkwork/file-sdk-adapter` with semantic generated SDK wrapper
      client interfaces, app service facade mapping, backend admin storage port
      mapping for provider/bucket/quota configuration commands,
      usage/bucket/reconciliation/GC governance, standard validation, and
      `FileSdkAdapterError` normalization.
- [ ] Validate adapter command mappings against OpenAPI operations with JSON
      request bodies so wrapper methods never rely on weak or transport-shaped
      command inputs.
- [ ] Validate every adapter-mapped operation against an OpenAPI typed JSON
      `200` response so generated SDK return values stay strongly typed.
- [ ] Run SDK adapter tests and package typecheck.

## Task 15: SDK Generation Manifest Package

- [ ] Write failing manifest coverage for app/backend TypeScript SDK generation
      targets, package names, client names, API prefixes, OpenAPI source
      documents, deterministic artifact names, and generated-SDK-only transport
      policy.
- [ ] Run the SDK generation test and verify it fails because the generation
      package does not exist yet.
- [ ] Create `@sdkwork/file-sdk-generation` with canonical SDK generation
      targets, manifest validation, stable OpenAPI JSON artifact export,
      deterministic SDK family artifact write plans, assembly metadata, README
      content, sdkgen synchronized artifacts, SHA-256 hash manifests, safe
      artifact materialization, repository check/apply CLI commands, and drift
      verification.
- [ ] Gate SDK generation source OpenAPI documents through
      `@sdkwork/file-api-contracts` standard validation so invalid app/backend
      source documents cannot be exported as SDK generation inputs.
- [ ] Materialize the planned `sdks/file-app-sdk`,
      `sdks/file-backend-sdk`, and `sdks/file-sdk-generation-manifest.json`
      artifacts through the safe CLI, then verify check mode reports all
      planned files as unchanged.
- [ ] Run SDK generation tests and package typecheck.

## Task 16: PC React File Platform Aggregate Package

- [ ] Write failing aggregate package tests for upload, picker, attachment,
      preview, drive, and storage-usage component exports.
- [ ] Run the aggregate package test and verify it fails because the source
      entrypoint does not exist yet.
- [ ] Create `@sdkwork/file-platform-pc-react` as a re-export-only integration
      package with explicit byte-format helper aliases.
- [ ] Run aggregate package tests and package typecheck.

## Verification Commands

- `pnpm.cmd --dir packages/common/file/sdkwork-file-contracts test`
- `pnpm.cmd --dir packages/common/file/sdkwork-file-sdk-ports test`
- `pnpm.cmd --dir packages/common/file/sdkwork-file-upload-client test`
- `pnpm.cmd --dir packages/common/file/sdkwork-file-schema test`
- `pnpm.cmd --dir packages/common/file/sdkwork-file-api-contracts test`
- `pnpm.cmd --dir packages/common/file/sdkwork-file-sdk-generation test`
- `pnpm.cmd sdk:file:artifacts:check -- --json`
- `pnpm.cmd --dir packages/common/file/sdkwork-file-sdk-adapter test`
- `pnpm.cmd --dir packages/common/file/sdkwork-file-service test`
- `pnpm.cmd --dir packages/common/file/sdkwork-file-contracts typecheck`
- `pnpm.cmd --dir packages/common/file/sdkwork-file-sdk-ports typecheck`
- `pnpm.cmd --dir packages/common/file/sdkwork-file-upload-client typecheck`
- `pnpm.cmd --dir packages/common/file/sdkwork-file-schema typecheck`
- `pnpm.cmd --dir packages/common/file/sdkwork-file-api-contracts typecheck`
- `pnpm.cmd --dir packages/common/file/sdkwork-file-sdk-generation typecheck`
- `pnpm.cmd --dir packages/common/file/sdkwork-file-sdk-adapter typecheck`
- `pnpm.cmd --dir packages/common/file/sdkwork-file-service typecheck`
- `pnpm.cmd --dir packages/pc-react/file/sdkwork-file-upload-pc-react test`
- `pnpm.cmd --dir packages/pc-react/file/sdkwork-file-upload-pc-react typecheck`
- `pnpm.cmd --dir packages/pc-react/file/sdkwork-file-picker-pc-react test`
- `pnpm.cmd --dir packages/pc-react/file/sdkwork-file-picker-pc-react typecheck`
- `pnpm.cmd --dir packages/pc-react/file/sdkwork-file-attachments-pc-react test`
- `pnpm.cmd --dir packages/pc-react/file/sdkwork-file-attachments-pc-react typecheck`
- `pnpm.cmd --dir packages/pc-react/file/sdkwork-file-preview-pc-react test`
- `pnpm.cmd --dir packages/pc-react/file/sdkwork-file-preview-pc-react typecheck`
- `pnpm.cmd --dir packages/pc-react/file/sdkwork-drive-pc-react test`
- `pnpm.cmd --dir packages/pc-react/file/sdkwork-drive-pc-react typecheck`
- `pnpm.cmd --dir packages/pc-react/file/sdkwork-storage-usage-pc-react test`
- `pnpm.cmd --dir packages/pc-react/file/sdkwork-storage-usage-pc-react typecheck`
- `pnpm.cmd --dir packages/pc-react/file/sdkwork-file-platform-pc-react test`
- `pnpm.cmd --dir packages/pc-react/file/sdkwork-file-platform-pc-react typecheck`

