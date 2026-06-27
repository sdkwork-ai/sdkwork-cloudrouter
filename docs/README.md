# Docs

## Purpose
`docs/` stores repository documentation, architecture decisions, runbooks, design notes, changelogs, installation guides, and product delivery evidence.

## Owner
SDKWork Claw Router maintainers and documentation owners.

## Allowed Content
Architecture documentation, installation guides, release notes, runbooks, schema registry documentation, design evidence, and documentation assets.

## Forbidden Content
Generated SDK transport output, live credentials, private customer data, runtime databases, local logs, caches, and copied root standards.

## Related Specs
- `../../sdkwork-specs/SDKWORK_WORKSPACE_SPEC.md`
- `../../sdkwork-specs/DOCUMENTATION_SPEC.md`
- `../../sdkwork-specs/ARCHITECTURE_DECISION_SPEC.md`

## Verification
- `python -B tools/architecture_standard_guardian.py`
- `pnpm check:alignment:audit`

## Canon Documents

| Document | Path |
| --- | --- |
| Product PRD | [product/prd/PRD.md](product/prd/PRD.md) |
| Technical architecture | [architecture/tech/TECH_ARCHITECTURE.md](architecture/tech/TECH_ARCHITECTURE.md) |
| Standard alignment audit | [standard-alignment-audit.md](standard-alignment-audit.md) |
| Schema registry catalog | [schema-registry/table-catalog.md](schema-registry/table-catalog.md) |
| Production runbook | [../deployments/runbooks/production-operations.md](../deployments/runbooks/production-operations.md) |

## Document Domains

| Domain | Path | Owner |
| --- | --- | --- |
| gateway | `architecture/tech/TECH-*.md`, `runbooks/gateway-*.md` | clawrouter-gateway |
| commerce | `architecture/tech/TECH-commerce-*.md`, `runbooks/commerce-*.md` | clawrouter-data |
| iam | `architecture/tech/TECH-iam-*.md`, `runbooks/iam-*.md` | clawrouter-security |
| security | `SECURITY.md`, `runbooks/security-*.md` | clawrouter-security |
| observability | `architecture/tech/TECH-observability-*.md` | clawrouter-observability |
| release | `release/CHANGELOG.md`, `release/VERSION.md` | clawrouter-release |
| deployment | `../deployments/`, `../etc/nginx/` | clawrouter-release |
| frontend | `architecture/tech/TECH-portal-*.md` | clawrouter-frontend |

## Index

See [INDEX.yaml](INDEX.yaml) for the machine-readable document registry. Every
REQ-*, ADR-*, TECH-*, and PLAN-* document must be registered there before merge.
