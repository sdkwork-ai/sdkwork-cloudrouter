# Commerce Documentation

## Audience Routing

| I am… | Read first | Then read |
| --- | --- | --- |
| Product or business | [product/prd/PRD.md](product/prd/PRD.md) | [product/requirements/](product/requirements/) |
| Architect | [architecture/tech/TECH-2026-06-24-commerce-repository-dissolution.md](architecture/tech/TECH-2026-06-24-commerce-repository-dissolution.md) | per-T1 `../sdkwork-*/docs/` |
| Developer | [guides/developer/README.md](guides/developer/README.md) | [engineering/plans/](engineering/plans/) |
| Operator | [guides/operator/README.md](guides/operator/README.md) | [runbooks/](runbooks/) |
| Integrator | [guides/integrator/README.md](guides/integrator/README.md) | repository `apis/` and `sdks/` |
| Agent | [../AGENTS.md](../AGENTS.md) | [INDEX.yaml](INDEX.yaml) |

## Canon Documents

| Document | Path |
| --- | --- |
| Product PRD | [product/prd/PRD.md](product/prd/PRD.md) |
| Technical architecture | [architecture/tech/TECH_ARCHITECTURE.md](architecture/tech/TECH_ARCHITECTURE.md) (points to dissolution) |
| Repository dissolution | [architecture/tech/TECH-2026-06-24-commerce-repository-dissolution.md](architecture/tech/TECH-2026-06-24-commerce-repository-dissolution.md) |
| PC capability distribution | [architecture/tech/TECH-2026-06-24-commerce-pc-capability-distribution.md](architecture/tech/TECH-2026-06-24-commerce-pc-capability-distribution.md) |

## Related Specs

- `../sdkwork-specs/DOCUMENTATION_SPEC.md`
- `../sdkwork-specs/SDKWORK_WORKSPACE_SPEC.md`
- `../sdkwork-specs/REQUIREMENTS_SPEC.md`

## Verification

```bash
node ../sdkwork-specs/tools/check-repository-docs-standard.mjs --root .
node tools/sync_commerce_capability_docs.mjs
```
