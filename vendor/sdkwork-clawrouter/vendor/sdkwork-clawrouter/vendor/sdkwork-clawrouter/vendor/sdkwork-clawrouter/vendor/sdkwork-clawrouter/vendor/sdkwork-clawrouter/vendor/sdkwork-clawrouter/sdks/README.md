# SDKs

## Purpose
`sdks/` stores SDK family workspaces, materialized API authority OpenAPI outputs, derived SDK generator inputs, generated language packages, and SDK component specs.

## Owner
SDKWork Claw Router SDK maintainers and API generation owners.

## Allowed Content
Generated and composed SDK workspaces, SDK family manifests, generated OpenAPI materialization outputs, generator evidence, SDK READMEs, and SDK verification metadata.

## Forbidden Content
Authored API contract source that belongs in `apis/`, product server implementation code, local credential files, runtime cache, and hand-edited generated transport code.

## Related Specs
- `../../sdkwork-specs/SDKWORK_WORKSPACE_SPEC.md`
- `../../sdkwork-specs/SDK_SPEC.md`
- `../../sdkwork-specs/SDK_WORKSPACE_GENERATION_SPEC.md`

## Verification
- `python -B -m tools.api_contract_manifest`
- `python -B -m tools.clawrouter_openapi_generator`
- `python -B tools/architecture_standard_guardian.py`
