# SDKWork Commerce PC Technical Architecture

Status: draft
Owner: SDKWork maintainers
Updated: 2026-06-25
Specs: ARCHITECTURE_DECISION_SPEC.md, DOCUMENTATION_SPEC.md, SDKWORK_WORKSPACE_SPEC.md

## 1. Architecture Overview

Describe the repository/application architecture for SDKWork Commerce PC.

## 2. Technology Choices

| Category | Choice | Rationale | Root spec |
| --- | --- | --- | --- |
| Repository layout | SDKWork standard directories | Workspace interoperability | SDKWORK_WORKSPACE_SPEC.md |

## 3. System Boundaries And Modules

## 4. Directory And Package Layout

## 5. API, SDK, And Data Ownership

## 6. Security, Privacy, And Observability

## 7. Deployment And Runtime Topology

## 8. Architecture Decision Index


- [TECH-2026-06-07-commerce-product-center-migration-design.md](TECH-2026-06-07-commerce-product-center-migration-design.md)
- [TECH-2026-06-07-commerce-product-center-migration.md](TECH-2026-06-07-commerce-product-center-migration.md)
- [TECH-2026-06-10-commerce-order-payment-hardening-design.md](TECH-2026-06-10-commerce-order-payment-hardening-design.md)
- [TECH-2026-06-10-commerce-order-payment-hardening.md](TECH-2026-06-10-commerce-order-payment-hardening.md)
- [TECH-2026-06-10-commerce-standard-product-foundation-design.md](TECH-2026-06-10-commerce-standard-product-foundation-design.md)
- [TECH-2026-06-10-commerce-transaction-schema-hardening-design.md](TECH-2026-06-10-commerce-transaction-schema-hardening-design.md)
- [TECH-2026-06-18-commerce-standards-alignment.md](TECH-2026-06-18-commerce-standards-alignment.md)
- [TECH-2026-06-24-commerce-capability-repo-split-alignment.md](TECH-2026-06-24-commerce-capability-repo-split-alignment.md)
- [TECH-2026-06-24-commerce-module-completeness-roadmap.md](TECH-2026-06-24-commerce-module-completeness-roadmap.md)
- [TECH-2026-06-24-commerce-pc-capability-distribution.md](TECH-2026-06-24-commerce-pc-capability-distribution.md)
- [TECH-2026-06-24-commerce-repository-dissolution.md](TECH-2026-06-24-commerce-repository-dissolution.md)
## 9. Verification

```bash
node ../sdkwork-specs/tools/check-repository-docs-standard.mjs --root .
```
