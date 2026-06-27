# SaaS Verification Code Delivery Implementation Plan

> **Superseded (2026-06-25):** Claw Router verification delivery and auth routes are owned by federated `sdkwork-routes-iam-app-api` in `sdkwork-iam`. See `../../sdkwork-iam/docs/IAM_INTEGRATION.md`.

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a standard verification-code delivery system for Java SaaS and Rust SaaS, with admin-managed email/SMS provider configuration and strict dev/prod behavior.

**Architecture:** Verification code generation, persistence, delivery, and verification stay separated. Java uses the existing `PlusChannelAccount` provider model and message dispatch services; Rust gets an explicit `VerificationCodeSender` port injected into auth routes, with dev debug delivery and production delivery contracts. Admin configuration remains provider/account based and exposes SMS/email as first-class notification resources instead of mixing them into AI model routing.

**Tech Stack:** Rust Axum/sqlx, Java Spring Boot/JPA, existing channel account configuration, existing mail/SMS model factories, TDD with Rust integration tests and Java service/controller tests.

---

### Task 1: Rust Verification Sender Port

**Files:**
- Modify: `services/sdkwork-clawrouter-router-service/src/api/app_auth.rs`
- Modify: `services/sdkwork-clawrouter-router-service/src/ports/mod.rs`
- Create: `services/sdkwork-clawrouter-router-service/src/ports/verification_code_sender.rs`
- Test: `services/sdkwork-clawrouter-router-service/tests/app_auth_api.rs`

- [ ] Write failing tests proving verification code creation uses an injected sender and does not expose `debugCode` when delivery mode is production.
- [ ] Add `VerificationCodeDeliveryRequest`, `VerificationCodeDeliveryReceipt`, and `VerificationCodeSender`.
- [ ] Add default senders: `DebugVerificationCodeSender` for local/dev, `RequiredConfiguredVerificationCodeSender` for production configuration failures.
- [ ] Inject the sender through auth router state without breaking existing route constructors.
- [ ] Send login/register/password-reset codes through the sender after persistence.
- [ ] Keep local/dev tests able to inspect debug delivery without production API leakage.
- [ ] Run `cargo test -p sdkwork-clawrouter-router-service --test app_auth_api`.

### Task 2: Rust Provider Config Read Model

**Files:**
- Create: `services/sdkwork-clawrouter-router-service/src/ports/verification_delivery_config_store.rs`
- Create: `services/sdkwork-clawrouter-router-service/src/infrastructure/sql/sqlite/verification_delivery_config_store.rs`
- Create: `services/sdkwork-clawrouter-router-service/src/infrastructure/sql/postgres/verification_delivery_config_store.rs`
- Modify: `services/sdkwork-clawrouter-router-service/src/infrastructure/sql/sqlite/mod.rs`
- Modify: `services/sdkwork-clawrouter-router-service/src/infrastructure/sql/postgres/mod.rs`
- Test: new focused Rust SQL store tests

- [ ] Write failing tests for selecting active EMAIL/SMS verification delivery configuration by tenant, organization, channel, scene, and priority.
- [ ] Implement config structs with provider code, channel, account code, secret ref, sender/sign/template metadata, and status.
- [ ] Read from notification-specific config tables or clearly scoped integration tables with notification profile.
- [ ] Add validation that production delivery fails closed when no active provider is configured.

### Task 3: Java Verification Provider Standardization

**Files:**
- Modify: `legacy-java-plus-service/src/main/java/com/sdkwork/spring/ai/plus/service/email/impl/EmailSendServiceImpl.java`
- Modify: `legacy-java-plus-service/src/main/java/com/sdkwork/spring/ai/plus/service/sms/impl/SmsSendServiceImpl.java`
- Modify: `legacy-java-plus-service/src/main/java/com/sdkwork/spring/ai/plus/service/message/impl/MessageDispatchServiceImpl.java`
- Test: existing auth/message tests plus new provider-selection tests

- [ ] Write failing tests proving Java verification sends use active provider/account configuration for EMAIL and SMS.
- [ ] Standardize scene keys and provider metadata for login, register, reset password, bind email, and bind phone.
- [ ] Ensure production dispatch throws configuration errors when required provider configuration is missing.
- [ ] Keep dev-only fixed code behavior isolated from production delivery.

### Task 4: Java Admin Configuration Surface

**Files:**
- Modify: `legacy-java-plus-backend-api/src/main/java/com/sdkwork/spring/ai/plus/controller/platform/PlusChannelAccountController.java`
- Modify: `legacy-java-plus-backend-api/src/main/java/com/sdkwork/spring/ai/plus/form/platform/PlusChannelAccountForm.java`
- Modify: `legacy-java-plus-entity/src/main/java/com/sdkwork/spring/ai/plus/core/type/ChannelResourceType.java` if EMAIL must become first-class
- Test: backend controller contract tests

- [ ] Write failing tests for listing and saving SMS and email sending accounts through admin.
- [ ] Make EMAIL and SMS resources explicit in admin terminology.
- [ ] Support different cloud vendors through channel/provider fields and structured configs.
- [ ] Keep secrets masked or referenced; never return raw secrets.

### Task 5: Verification and Documentation

**Files:**
- Modify: relevant README or docs under `docs/`

- [ ] Document dev behavior: code `666666`, no real delivery.
- [ ] Document production behavior: real delivery required, debug code hidden.
- [ ] Run focused Rust tests.
- [ ] Run focused Java Maven tests for auth/message/channel account.
- [ ] Report any broader test commands that are blocked by existing dirty/generated workspace state.
