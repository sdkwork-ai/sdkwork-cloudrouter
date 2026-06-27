# SDKWork Claw Router Technical Architecture

Status: active
Owner: SDKWork maintainers
Updated: 2026-06-24
Specs: ARCHITECTURE_DECISION_SPEC.md, DOCUMENTATION_SPEC.md

## Document Map

- [TECH-02-architecturedesign.md](TECH-02-architecturedesign.md)
- [TECH-03-tech-stack.md](TECH-03-tech-stack.md)
- [TECH-04-modulesplanning.md](TECH-04-modulesplanning.md)
- [TECH-05-design.md](TECH-05-design.md)
- [TECH-06-api-gateway-standarddesign.md](TECH-06-api-gateway-standarddesign.md)
- [TECH-07-performancedesign.md](TECH-07-performancedesign.md)
- [TECH-08-securitydesign.md](TECH-08-securitydesign.md)
- [TECH-09-deploymentarchitecturedesign.md](TECH-09-deploymentarchitecturedesign.md)
- [TECH-10-api-architecture.md](TECH-10-api-architecture.md)
- [TECH-11-design.md](TECH-11-design.md)
- [TECH-12-featuresmodules.md](TECH-12-featuresmodules.md)
- [TECH-13-schemaregistry-design.md](TECH-13-schemaregistry-design.md)
- [TECH-15-new-api-sub2api-clawrouter-design.md](TECH-15-new-api-sub2api-clawrouter-design.md)
- [TECH-16-design.md](TECH-16-design.md)
- [TECH-17-appcenter-plusapp-compatible-design.md](TECH-17-appcenter-plusapp-compatible-design.md)
- [TECH-18-skillshub-agentskills-pluscategory-compatible-design.md](TECH-18-skillshub-agentskills-pluscategory-compatible-design.md)
- [TECH-19-finance-trade-java-compatible-design.md](TECH-19-finance-trade-java-compatible-design.md)
- [TECH-20-schema-guardian-quality-gate.md](TECH-20-schema-guardian-quality-gate.md)
- [TECH-2026-05-06-model-catalog-pricing-standard-design.md](TECH-2026-05-06-model-catalog-pricing-standard-design.md)
- [TECH-2026-05-06-model-catalog-pricing-standard.md](TECH-2026-05-06-model-catalog-pricing-standard.md)
- [TECH-2026-05-07-sdkwork-models-install-flow.md](TECH-2026-05-07-sdkwork-models-install-flow.md)
- [TECH-2026-05-09-sdkwork-app-system.md](TECH-2026-05-09-sdkwork-app-system.md)
- [TECH-2026-05-10-group-account-pool-routing.md](TECH-2026-05-10-group-account-pool-routing.md)
- [TECH-2026-05-12-forum-default-tutorial-seed.md](TECH-2026-05-12-forum-default-tutorial-seed.md)
- [TECH-2026-05-13-generation-claw-router-capture-billing.md](TECH-2026-05-13-generation-claw-router-capture-billing.md)
- [TECH-2026-05-13-generation-standard-appbase-plan.md](TECH-2026-05-13-generation-standard-appbase-plan.md)
- [TECH-2026-05-14-saas-verification-code-delivery.md](TECH-2026-05-14-saas-verification-code-delivery.md)
- [TECH-2026-05-15-v0-1-0.md](TECH-2026-05-15-v0-1-0.md)
- [TECH-2026-05-16-v0-2-0.md](TECH-2026-05-16-v0-2-0.md)
- [TECH-2026-05-17-agent-platform-design.md](TECH-2026-05-17-agent-platform-design.md)
- [TECH-2026-05-17-agent-platform.md](TECH-2026-05-17-agent-platform.md)
- [TECH-2026-05-17-v0-3-0.md](TECH-2026-05-17-v0-3-0.md)
- [TECH-2026-05-18-chat-conversation-agent-memory-design.md](TECH-2026-05-18-chat-conversation-agent-memory-design.md)
- [TECH-2026-05-18-chat-conversation-agent-memory.md](TECH-2026-05-18-chat-conversation-agent-memory.md)
- [TECH-2026-05-20-appbase-commerce-account-wallet-ledger.md](TECH-2026-05-20-appbase-commerce-account-wallet-ledger.md)
- [TECH-2026-05-20-appbase-commerce-platform-design.md](TECH-2026-05-20-appbase-commerce-platform-design.md)
- [TECH-2026-05-21-appbase-commerce-standard-design.md](TECH-2026-05-21-appbase-commerce-standard-design.md)
- [TECH-2026-05-21-appbase-commerce-standard-phase1.md](TECH-2026-05-21-appbase-commerce-standard-phase1.md)
- [TECH-2026-05-22-admin-product-center-design.md](TECH-2026-05-22-admin-product-center-design.md)
- [TECH-2026-05-22-admin-product-center.md](TECH-2026-05-22-admin-product-center.md)
- [TECH-2026-05-22-provider-adapter-invocation-design.md](TECH-2026-05-22-provider-adapter-invocation-design.md)
- [TECH-2026-05-22-provider-adapter-invocation.md](TECH-2026-05-22-provider-adapter-invocation.md)
- [TECH-2026-05-23-admin-membership-center-completeness-design.md](TECH-2026-05-23-admin-membership-center-completeness-design.md)
- [TECH-2026-05-23-admin-membership-center-completeness.md](TECH-2026-05-23-admin-membership-center-completeness.md)
- [TECH-2026-05-23-appbase-promotion-membership-entitlement-core.md](TECH-2026-05-23-appbase-promotion-membership-entitlement-core.md)
- [TECH-2026-05-23-appbase-promotion-membership-entitlement-design.md](TECH-2026-05-23-appbase-promotion-membership-entitlement-design.md)
- [TECH-2026-05-23-payment-center-default-initialization-design.md](TECH-2026-05-23-payment-center-default-initialization-design.md)
- [TECH-2026-05-23-payment-center-default-initialization.md](TECH-2026-05-23-payment-center-default-initialization.md)
- [TECH-2026-05-23-recharge-package-ratio-design.md](TECH-2026-05-23-recharge-package-ratio-design.md)
- [TECH-2026-05-23-sdkwork-file-platform-design.md](TECH-2026-05-23-sdkwork-file-platform-design.md)
- [TECH-2026-05-23-sdkwork-file-platform-foundation.md](TECH-2026-05-23-sdkwork-file-platform-foundation.md)
- [TECH-2026-05-23-test-efficiency-optimization.md](TECH-2026-05-23-test-efficiency-optimization.md)
- [TECH-2026-05-25-channel-group-channel-association.md](TECH-2026-05-25-channel-group-channel-association.md)
- [TECH-2026-05-26-admin-marketing-promotion-standard-design.md](TECH-2026-05-26-admin-marketing-promotion-standard-design.md)
- [TECH-2026-05-26-admin-prompts-mcp-vertical.md](TECH-2026-05-26-admin-prompts-mcp-vertical.md)
- [TECH-2026-05-29-ai-routing-sticky-cache.md](TECH-2026-05-29-ai-routing-sticky-cache.md)
- [TECH-2026-05-29-all-in-one-runtime.md](TECH-2026-05-29-all-in-one-runtime.md)
- [TECH-2026-05-29-api-reference-aggregate-groups.md](TECH-2026-05-29-api-reference-aggregate-groups.md)
- [TECH-2026-05-29-payment-transit-system-design.md](TECH-2026-05-29-payment-transit-system-design.md)
- [TECH-2026-05-29-payment-transit-system.md](TECH-2026-05-29-payment-transit-system.md)
- [TECH-2026-05-29-rust-test-performance-report.md](TECH-2026-05-29-rust-test-performance-report.md)
- [TECH-2026-05-30-recharge-multi-currency-standardization.md](TECH-2026-05-30-recharge-multi-currency-standardization.md)
- [TECH-2026-06-01-admin-category-initialization-standard.md](TECH-2026-06-01-admin-category-initialization-standard.md)
- [TECH-2026-06-02-admin-model-mapping-design.md](TECH-2026-06-02-admin-model-mapping-design.md)
- [TECH-2026-06-02-admin-model-mapping.md](TECH-2026-06-02-admin-model-mapping.md)
- [TECH-2026-06-05-api-router-invocation-pipeline-redesign.md](TECH-2026-06-05-api-router-invocation-pipeline-redesign.md)
- [TECH-2026-06-05-api-router-invocation-pipeline-rewrite.md](TECH-2026-06-05-api-router-invocation-pipeline-rewrite.md)
- [TECH-2026-06-09-api-relay-provider-platform-design.md](TECH-2026-06-09-api-relay-provider-platform-design.md)
- [TECH-2026-06-09-appbase-oauth-system-design.md](TECH-2026-06-09-appbase-oauth-system-design.md)
- [TECH-2026-06-09-appbase-oauth-system.md](TECH-2026-06-09-appbase-oauth-system.md)
- [TECH-2026-06-10-admin-product-center-commercial-design.md](TECH-2026-06-10-admin-product-center-commercial-design.md)
- [TECH-2026-06-10-admin-product-center-commercial.md](TECH-2026-06-10-admin-product-center-commercial.md)
- [TECH-2026-06-13-single-port-dev-topology-design.md](TECH-2026-06-13-single-port-dev-topology-design.md)
- [TECH-2026-06-13-single-port-dev-topology.md](TECH-2026-06-13-single-port-dev-topology.md)
- [TECH-2026-06-20-router-minimal-domain-migration-design.md](TECH-2026-06-20-router-minimal-domain-migration-design.md)
- [TECH-2026-06-21-generation-field-mapping-ai-to-generation.md](TECH-2026-06-21-generation-field-mapping-ai-to-generation.md)
- [TECH-2026-06-21-kernel-field-mapping-ai-to-agent.md](TECH-2026-06-21-kernel-field-mapping-ai-to-agent.md)
- [TECH-2026-06-21-memory-field-mapping-ai-to-mem.md](TECH-2026-06-21-memory-field-mapping-ai-to-mem.md)
- [TECH-21-schema-compiler-postgres-ddl.md](TECH-21-schema-compiler-postgres-ddl.md)
- [TECH-22-domain-type-generator.md](TECH-22-domain-type-generator.md)
- [TECH-23-schema-manifest.md](TECH-23-schema-manifest.md)
- [TECH-24-openapi-schema-components.md](TECH-24-openapi-schema-components.md)
- [TECH-25-frontend-contract-guardian.md](TECH-25-frontend-contract-guardian.md)
- [TECH-26-java-legacy-contract-audit.md](TECH-26-java-legacy-contract-audit.md)
- [TECH-27-rust-runtime-and-sdk-integration-standard.md](TECH-27-rust-runtime-and-sdk-integration-standard.md)
- [TECH-28-architecture-standard-guardian.md](TECH-28-architecture-standard-guardian.md)
- [TECH-29-rust-backend-module-standard.md](TECH-29-rust-backend-module-standard.md)
- [TECH-30-flyway-schema-contract-audit.md](TECH-30-flyway-schema-contract-audit.md)
- [TECH-30-platform-data-model-v4.md](TECH-30-platform-data-model-v4.md)
- [TECH-31-clawrouter-openapi-generator.md](TECH-31-clawrouter-openapi-generator.md)
- [TECH-31-product-composition-model.md](TECH-31-product-composition-model.md)
- [TECH-32-sdkwork-models-standard.md](TECH-32-sdkwork-models-standard.md)
- [TECH-33-sdkwork-models-install-flow.md](TECH-33-sdkwork-models-install-flow.md)
- [TECH-34-login-qrcode-system.md](TECH-34-login-qrcode-system.md)
- [TECH-changelog.md](TECH-changelog.md)
- [TECH-deployment-modes-2.md](TECH-deployment-modes-2.md)
- [TECH-deployment-modes.md](TECH-deployment-modes.md)
- [TECH-initialization-2.md](TECH-initialization-2.md)
- [TECH-initialization.md](TECH-initialization.md)
- [TECH-legacy-14.md](TECH-legacy-14.md)
- [TECH-postgresql-database-configuration.md](TECH-postgresql-database-configuration.md)
- [TECH-postgresql-development.md](TECH-postgresql-development.md)
- [TECH-postgresql-production.md](TECH-postgresql-production.md)
- [TECH-provider-adapter-architecture.md](TECH-provider-adapter-architecture.md)
- [TECH-release-install-2.md](TECH-release-install-2.md)
- [TECH-release-install.md](TECH-release-install.md)
- [TECH-source-install-2.md](TECH-source-install-2.md)
- [TECH-source-install.md](TECH-source-install.md)
- [TECH-standard-alignment-audit.md](TECH-standard-alignment-audit.md)
- [TECH-table-catalog.md](TECH-table-catalog.md)
- [TECH-topology-standard.md](TECH-topology-standard.md)
- [TECH-usage-2.md](TECH-usage-2.md)
- [TECH-usage.md](TECH-usage.md)
- [TECH-verification-code-delivery.md](TECH-verification-code-delivery.md)
- [TECH-version.md](TECH-version.md)

## 1. Architecture Overview

Architecture detail lives in the linked TECH shards below.


## 2. Technology Choices

## 3. System Boundaries And Modules

## 4. Directory And Package Layout

## 5. API, SDK, And Data Ownership

## 6. Security, Privacy, And Observability

## 7. Deployment And Runtime Topology

## 8. Architecture Decision Index

## 9. Verification
