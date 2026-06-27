# Generation Claw Router Capture Billing Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a generation execution kernel that records every generation/run/provider task/resource, invokes Claw Router open APIs for image/video generation, captures provider outputs to durable storage when policy allows, optionally syncs captured resources into PlusDisk/PlusFile assets, and produces explicit billing quotes.

**Architecture:** Keep generation orchestration in `legacy-java-plus-service` and persistence contracts in `legacy-java-plus-entity`/`repository`. Use `plus_ai_generation_resource` as the single input/output resource ledger, separate provider tasks/events from user-visible artifacts, separate output capture from PlusFile asset sync, and route multimodal provider calls through a Claw Router client boundary. Existing `PlusDisk` remains the storage space; directories/assets remain `PlusFile` rows.

**Tech Stack:** Java 21, Spring Boot, Spring Data JPA, JUnit 5, Mockito, PostgreSQL DDL, existing `MediaResource`, `PlusFileService`, `PlusDiskService`, and `BillingStandardService`.

---

### Task 1: Service Boundary And Policy Tests

**Files:**
- Create: `legacy-java-plus-service/src/test/java/com/sdkwork/spring/ai/plus/service/generation/support/GenerationOutputPersistenceDecisionServiceTest.java`
- Create: `legacy-java-plus-service/src/main/java/com/sdkwork/spring/ai/plus/service/generation/model/GenerationStoragePreference.java`
- Create: `legacy-java-plus-service/src/main/java/com/sdkwork/spring/ai/plus/service/generation/model/GenerationEntitlement.java`
- Create: `legacy-java-plus-service/src/main/java/com/sdkwork/spring/ai/plus/service/generation/model/GenerationOutputPersistenceRequest.java`
- Create: `legacy-java-plus-service/src/main/java/com/sdkwork/spring/ai/plus/service/generation/model/GenerationOutputPersistenceDecision.java`
- Create: `legacy-java-plus-service/src/main/java/com/sdkwork/spring/ai/plus/service/generation/support/GenerationOutputPersistenceDecisionService.java`
- Create: `legacy-java-plus-service/src/main/java/com/sdkwork/spring/ai/plus/service/generation/support/DefaultGenerationOutputPersistenceDecisionService.java`

- [ ] **Step 1: Write failing policy tests**

```java
@Test
void testMembershipCanCaptureAndSyncAssetsWhenRequested() {
    var service = new DefaultGenerationOutputPersistenceDecisionService();
    var decision = service.decide(GenerationOutputPersistenceRequest.builder()
            .requestedPreference(GenerationStoragePreference.ASSET)
            .providerUrlExpires(true)
            .entitlement(GenerationEntitlement.membership())
            .build());
    assertTrue(decision.isCaptureRequired());
    assertTrue(decision.isAssetSyncAllowed());
}
```

- [ ] **Step 2: Run test to verify RED**

Run: `mvn -pl legacy-java-plus-service -Dtest=GenerationOutputPersistenceDecisionServiceTest test -DskipTests=false`

Expected: compile/test failure because classes do not exist.

- [ ] **Step 3: Implement minimal policy model**

Implement immutable Lombok DTOs and rules:
- `NONE` skips capture and asset sync.
- `TEMPORARY` captures only when provider URL expires or source is base64.
- `PERMANENT` always captures but does not create PlusFile asset.
- `ASSET` captures and syncs asset only when entitlement allows asset sync.
- Non-member can be limited to `TEMPORARY` or `PERMANENT` but cannot force `ASSET`.

- [ ] **Step 4: Run test to verify GREEN**

Run the same Maven command and expect PASS.

### Task 2: Resource Capture Service

**Files:**
- Create: `legacy-java-plus-service/src/test/java/com/sdkwork/spring/ai/plus/service/generation/support/GenerationResourceCaptureServiceImplTest.java`
- Create: `legacy-java-plus-service/src/main/java/com/sdkwork/spring/ai/plus/service/generation/model/GenerationResourceDescriptor.java`
- Create: `legacy-java-plus-service/src/main/java/com/sdkwork/spring/ai/plus/service/generation/model/GenerationResourceCaptureRequest.java`
- Create: `legacy-java-plus-service/src/main/java/com/sdkwork/spring/ai/plus/service/generation/model/GenerationResourceCaptureResult.java`
- Create: `legacy-java-plus-service/src/main/java/com/sdkwork/spring/ai/plus/service/generation/support/GenerationResourceStorage.java`
- Create: `legacy-java-plus-service/src/main/java/com/sdkwork/spring/ai/plus/service/generation/support/GenerationResourceCaptureService.java`
- Create: `legacy-java-plus-service/src/main/java/com/sdkwork/spring/ai/plus/service/generation/support/GenerationResourceCaptureServiceImpl.java`
- Create: `legacy-java-plus-service/src/main/java/com/sdkwork/spring/ai/plus/service/generation/support/PlusFileGenerationResourceStorage.java`

- [ ] **Step 1: Write failing capture tests**

Test URL capture, base64 capture, and `NONE` policy skip. Base64 must decode to bytes before storage and must not be stored as raw base64 in canonical output.

- [ ] **Step 2: Run test to verify RED**

Run: `mvn -pl legacy-java-plus-service -Dtest=GenerationResourceCaptureServiceImplTest test -DskipTests=false`

Expected: failure because capture classes do not exist.

- [ ] **Step 3: Implement capture service**

The capture service converts `MediaResource` URL/base64/bytes into an input stream and delegates storage to `GenerationResourceStorage`. The default storage uses `PlusFileService.uploadStream` and can target local FS/OSS/S3/MinIO through the disk's configured storage implementation.

- [ ] **Step 4: Run test to verify GREEN**

Run the same Maven command and expect PASS.

### Task 3: Claw Router Generation Client

**Files:**
- Create: `legacy-java-plus-service/src/test/java/com/sdkwork/spring/ai/plus/service/generation/claw/ClawRouterGenerationClientTest.java`
- Create: `legacy-java-plus-service/src/main/java/com/sdkwork/spring/ai/plus/service/generation/claw/ClawRouterGenerationOperation.java`
- Create: `legacy-java-plus-service/src/main/java/com/sdkwork/spring/ai/plus/service/generation/claw/ClawRouterModelRoute.java`
- Create: `legacy-java-plus-service/src/main/java/com/sdkwork/spring/ai/plus/service/generation/claw/ClawRouterGenerationRequest.java`
- Create: `legacy-java-plus-service/src/main/java/com/sdkwork/spring/ai/plus/service/generation/claw/ClawRouterGenerationResponse.java`
- Create: `legacy-java-plus-service/src/main/java/com/sdkwork/spring/ai/plus/service/generation/claw/ClawRouterGenerationEndpointResolver.java`
- Create: `legacy-java-plus-service/src/main/java/com/sdkwork/spring/ai/plus/service/generation/claw/ClawRouterGenerationClient.java`
- Create: `legacy-java-plus-service/src/main/java/com/sdkwork/spring/ai/plus/service/generation/claw/HttpClawRouterGenerationClient.java`

- [ ] **Step 1: Write failing client tests**

Test that `VIDEO_TEXT_TO_VIDEO`, `VIDEO_IMAGE_TO_VIDEO`, and `VIDEO_REFERENCE_TO_VIDEO` resolve to different Claw Router open endpoints, and image generation carries `modelVendorCode`, `modelCatalogKey`, `model`, `providerCode`, and raw request params.

- [ ] **Step 2: Run test to verify RED**

Run: `mvn -pl legacy-java-plus-service -Dtest=ClawRouterGenerationClientTest test -DskipTests=false`

Expected: failure because client classes do not exist.

- [ ] **Step 3: Implement endpoint resolver and HTTP boundary**

Use a simple injectable transport interface first so unit tests do not hit network. The HTTP implementation posts JSON to Claw Router open endpoints and returns raw JSON plus provider task IDs/resources extracted later by the orchestrator.

- [ ] **Step 4: Run test to verify GREEN**

Run the same Maven command and expect PASS.

### Task 4: Billing Wrapper For Generation

**Files:**
- Create: `legacy-java-plus-service/src/test/java/com/sdkwork/spring/ai/plus/service/generation/support/GenerationBillingServiceTest.java`
- Create: `legacy-java-plus-service/src/main/java/com/sdkwork/spring/ai/plus/service/generation/model/GenerationBillingEstimateRequest.java`
- Create: `legacy-java-plus-service/src/main/java/com/sdkwork/spring/ai/plus/service/generation/support/GenerationBillingService.java`
- Create: `legacy-java-plus-service/src/main/java/com/sdkwork/spring/ai/plus/service/generation/support/GenerationBillingServiceImpl.java`

- [ ] **Step 1: Write failing billing tests**

Test image output count maps to `IMAGE_COUNT`, video duration * output count maps to `VIDEO_SECONDS`, speech maps to character/audio seconds, and storage capture can include `DATA_BYTES`.

- [ ] **Step 2: Run test to verify RED**

Run: `mvn -pl legacy-java-plus-service -Dtest=GenerationBillingServiceTest test -DskipTests=false`

Expected: failure because billing wrapper does not exist.

- [ ] **Step 3: Implement wrapper**

Build `BillingRequest` with `BillingScene`, `UsageType`, `modelName`, `product`, and extras compatible with `DefaultBillingMetricExtractor`.

- [ ] **Step 4: Run test to verify GREEN**

Run the same Maven command and expect PASS.

### Task 5: Persistence Schema And Entity Skeleton

**Files:**
- Modify: `spring-ai-plus-server-application/src/main/resources/database/postgresql/feature/V104__builder_metadata_marketplace.sql`
- Create: `legacy-java-plus-entity/src/main/java/com/sdkwork/spring/ai/plus/entity/generation/PlusAiGenerationRun.java`
- Create: `legacy-java-plus-entity/src/main/java/com/sdkwork/spring/ai/plus/entity/generation/PlusAiGenerationProviderTask.java`
- Create: `legacy-java-plus-entity/src/main/java/com/sdkwork/spring/ai/plus/entity/generation/PlusAiGenerationResource.java`
- Create: `legacy-java-plus-entity/src/main/java/com/sdkwork/spring/ai/plus/entity/generation/PlusAiGenerationResourceCapture.java`
- Create: `legacy-java-plus-entity/src/main/java/com/sdkwork/spring/ai/plus/entity/generation/PlusAiGenerationAssetSync.java`
- Create repository interfaces for each new entity under `legacy-java-plus-repository/src/main/java/com/sdkwork/spring/ai/plus/repository/generation/`

- [ ] **Step 1: Add schema contract tests or compile-oriented entity tests**

Verify `plus_ai_generation_content` is no longer the standard write target and the new table names/columns exist in the DDL.

- [ ] **Step 2: Update DDL**

Redesign `plus_ai_generation` to hold request-level fields and add normalized child tables:
- `plus_ai_generation_run`
- `plus_ai_generation_provider_task`
- `plus_ai_generation_provider_event`
- `plus_ai_generation_artifact`
- `plus_ai_generation_segment`
- `plus_ai_generation_resource`
- `plus_ai_generation_resource_capture`
- `plus_ai_generation_asset_sync`
- `plus_ai_generation_usage`
- `plus_ai_generation_event`

- [ ] **Step 3: Add entities/repositories**

Keep fields explicit for query keys: tenant/user/status/type/vendor/model/provider/task id/capture status/asset sync status. Store raw payloads in JSONB only for snapshots and provider-specific parameters.

- [ ] **Step 4: Run entity/repository compile tests**

Run: `mvn -pl legacy-java-plus-repository -DskipTests=false test`

### Task 6: Video/Image Orchestration Integration

**Files:**
- Create: `legacy-java-plus-service/src/main/java/com/sdkwork/spring/ai/plus/service/generation/support/GenerationOrchestrationService.java`
- Create: `legacy-java-plus-service/src/main/java/com/sdkwork/spring/ai/plus/service/generation/support/GenerationOrchestrationServiceImpl.java`
- Modify: `legacy-java-plus-service/src/main/java/com/sdkwork/spring/ai/plus/service/generation/impl/PlusAiVideoGenerationServiceImpl.java`
- Modify: `legacy-java-plus-service/src/main/java/com/sdkwork/spring/ai/plus/service/generation/impl/PlusAiImageGenerationServiceImpl.java`

- [ ] **Step 1: Add tests around orchestration**

Verify create records generation/run/provider task, quotes billing before dispatch, calls the correct Claw Router operation, captures outputs on success when policy requires, and asset sync happens only after durable capture and entitlement pass.

- [ ] **Step 2: Implement orchestration**

Convert existing command objects to `ClawRouterGenerationRequest`, preserve vendor/model/request params/prompt input resources, and use provider task id for polling/callback.

- [ ] **Step 3: Replace direct provider SDK calls**

Stop calling `PlusVideoModel`/provider SDK directly for new image/video paths. Keep old model code only as deprecated fallback if explicitly configured.

- [ ] **Step 4: Run targeted regression tests**

Run generation, billing, file, and task tests.

---

## Self-Review Notes

- The plan intentionally does not treat `PlusDisk` as a directory. `PlusDisk` remains a disk/storage space; folders and generated assets are `PlusFile(type=DIRECTORY|FILE)`.
- `plus_ai_generation_content` should not be reintroduced as a standard generation result table. Prompts and all input/output media are resources; user-visible candidates are artifacts.
- Capture and asset sync are separate because provider URL durability and user asset creation have different policies, entitlement checks, failure modes, and retry semantics.
- Claw Router model vendor data is represented separately from execution provider routing: `modelVendorCode/modelCatalogKey/model/modelRequestParams` versus `providerCode/providerModel/integrationChannelId/providerTaskId`.
- Subagent plan review was not dispatched because this session's tool rules only allow spawning agents when the user explicitly asks for subagents. This plan was self-reviewed against the repository standards and the user's latest requirements.
