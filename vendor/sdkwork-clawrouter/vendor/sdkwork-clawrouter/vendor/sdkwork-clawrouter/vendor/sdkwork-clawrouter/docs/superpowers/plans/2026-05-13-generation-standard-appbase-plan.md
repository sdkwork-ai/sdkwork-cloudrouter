# Generation Standard Appbase Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a single, standard generation system across Java business services and sdkwork-appbase, with no legacy `plus_ai_generation_content` dependency and with reusable Rust/data/Playground contracts.

**Architecture:** Java remains the source-of-truth backend ledger and orchestration implementation. Appbase receives shared contracts, Rust-native domain crates, and a reusable Playground UI/service layer that consumes host adapters instead of claw-router-specific SDKs. Claw-router keeps only adapter-specific bindings.

**Tech Stack:** Java 21/Spring Boot/JPA/Flyway/PostgreSQL, TypeScript/React/pnpm/Vitest, Rust/Cargo.

---

### Task 1: Java Legacy Content Removal

**Files:**
- Delete or detach: `legacy-java-plus-workspace/legacy-java-plus-entity/src/main/java/com/sdkwork/spring/ai/plus/entity/generation/PlusAiGenerationContent.java`
- Delete or detach: `legacy-java-plus-workspace/legacy-java-plus-repository/src/main/java/com/sdkwork/spring/ai/plus/repository/generation/PlusAiGenerationContentRepository.java`
- Delete or detach: `legacy-java-plus-workspace/legacy-java-plus-service/src/main/java/com/sdkwork/spring/ai/plus/service/generation/PlusAiGenerationContentService.java`
- Delete or detach: `legacy-java-plus-workspace/legacy-java-plus-service/src/main/java/com/sdkwork/spring/ai/plus/service/generation/impl/PlusAiGenerationContentServiceImpl.java`
- Modify legacy generation services under `legacy-java-plus-workspace/legacy-java-plus-service/src/main/java/com/sdkwork/spring/ai/plus/service/generation/impl`
- Modify asset service reads under `legacy-java-plus-workspace/legacy-java-plus-service/src/main/java/com/sdkwork/spring/ai/plus/service/assets/impl/AssetServiceImpl.java`
- Modify tests that import `PlusAiGenerationContent`

- [ ] Write focused compile/contract checks that fail if `PlusAiGenerationContent` is referenced from production code.
- [ ] Remove production references and convert prompt/output lookup to `PlusAiGeneration` plus `PlusAiGenerationResource`.
- [ ] Remove create fallback branches that write old content records.
- [ ] Run `rg "PlusAiGenerationContent|plus_ai_generation_content"` and accept only docs/codegen audit if still intentionally present, otherwise zero production hits.
- [ ] Run focused Maven tests.

### Task 2: Java Standard Generation API

**Files:**
- Create: `legacy-java-plus-app-api/src/main/java/com/sdkwork/ai/gateway/api/app/v3/generation/GenerationAppApiController.java`
- Create forms/VOs under `legacy-java-plus-app-api/src/main/java/com/sdkwork/ai/gateway/api/app/v3/generation/form` and `vo`
- Create converter under `legacy-java-plus-app-api/src/main/java/com/sdkwork/ai/gateway/api/app/v3/generation/converter`
- Modify security policy if endpoint registration is required.

- [ ] Write controller/converter tests for submit/detail/resources/provider-result shape.
- [ ] Add unified submit form carrying operation, model route, prompt, modelRequestParams, inputResources, storage preference, entitlement and target PlusDisk/PlusFile fields.
- [ ] Add detail/resource VO that exposes runs, provider tasks, artifacts, resources, captures, asset sync, usage, and events.
- [ ] Add provider-result callback endpoint that delegates to `GenerationOrchestrationService.applyProviderResult`.
- [ ] Ensure category controllers remain thin facades over standard services.
- [ ] Run app-api focused tests and OpenAPI compile checks.

### Task 3: Java Polling, Capture, and Billing Hardening

**Files:**
- Modify: `legacy-java-plus-workspace/legacy-java-plus-service/src/main/java/com/sdkwork/spring/ai/plus/task/generation/GenerationResultQueryTask.java`
- Modify: `legacy-java-plus-workspace/legacy-java-plus-service/src/main/java/com/sdkwork/spring/ai/plus/service/generation/support/GenerationOrchestrationServiceImpl.java`
- Modify tests under `legacy-java-plus-workspace/legacy-java-plus-service/src/test/java/com/sdkwork/spring/ai/plus`

- [ ] Add tests for terminal idempotency, max polling, timeout failure, transient retrieve failure, and callback duplicate event.
- [ ] Add retry/backoff fields usage through existing provider task columns without schema churn.
- [ ] Preserve prehold/settle/release exactly once.
- [ ] Preserve URL/base64/bytes capture and asset sync via PlusFile/PlusDisk.
- [ ] Run generation focused suite.

### Task 4: Appbase TypeScript Contracts

**Files:** 
- Add tests under each package.

- [ ] Define TS contracts matching Java standard API DTOs.
- [ ] Define `MediaResource`, `GenerationModelRoute`, `GenerationResource`, `GenerationProviderTask`, `GenerationSubmitRequest`, `GenerationProviderResultRequest`.
- [ ] Define Playground session/job/model/asset/action contracts.
- [ ] Add pure validation/normalization helpers and Vitest tests.
- [ ] Run appbase package tests/typecheck.

### Task 5: Appbase Rust Generation

**Files:** 

- [ ] Mirror appbase existing native-rust package conventions.
- [ ] Add core Rust structs/enums for generation ledger, MediaResource, model route, storage policy, billing status.
- [ ] Add service traits for generation, router client, storage, billing, asset sync.
- [ ] Add HTTP DTO mapping crate.
- [ ] Add SQLx migration/schema crate for native persistence.
- [ ] Add Tauri command facade crate.
- [ ] Add Cargo tests for serde-like contract behavior where dependencies permit, otherwise pure Rust validation tests.

### Task 6: Appbase Public Playground

**Files:** 

- [ ] Move generic Playground types/components/service interfaces into appbase.
- [ ] Keep claw-router-specific SDK calls in a host adapter.
- [ ] Add model group, history, submit job, asset action, and readonly-disabled state contracts.
- [ ] Add Vitest/React rendering tests.
- [ ] Run claw-router portal package typecheck for the adapted package.

### Task 7: Final Verification

**Files:**
- No new implementation files.

- [ ] Run Java generation focused Maven suite.
- [ ] Run appbase typecheck and targeted Vitest/Cargo tests.
- [ ] Run `rg` audits for old content dependency and raw claw-router coupling in appbase Playground.
- [ ] Summarize remaining risks with exact files if any.
