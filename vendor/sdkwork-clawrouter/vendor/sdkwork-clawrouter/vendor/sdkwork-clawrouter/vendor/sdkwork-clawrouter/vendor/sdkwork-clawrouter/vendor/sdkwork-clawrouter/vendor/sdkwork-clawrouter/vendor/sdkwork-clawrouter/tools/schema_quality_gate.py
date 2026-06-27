from __future__ import annotations

import argparse
from dataclasses import dataclass
from pathlib import Path

from tools.api_contract_manifest import ApiContractManifestGenerator
from tools.appbase_capability_guardian import AppbaseCapabilityGuardian
from tools.appbase_integration_guardian import AppbaseIntegrationGuardian
from tools.appbase_openapi_schema_guardian import AppbaseOpenApiSchemaGuardian
from tools.architecture_standard_guardian import ArchitectureStandardGuardian
from tools.clawrouter_gateway_openapi_generator import ClawRouterGatewayOpenApiGenerator
from tools.clawrouter_openapi_contract_audit import ClawRouterOpenApiContractAudit
from tools.clawrouter_openapi_generator import ClawRouterOpenApiGenerator
from tools.clawrouter_openapi_precision_audit import ClawRouterOpenApiPrecisionAudit
from tools.clawrouter_payload_sdk_audit import ClawRouterPayloadSdkAudit
from tools.clawrouter_sdk_guardian import ClawRouterSdkGuardian
from tools.clawrouter_skill_guardian import ClawRouterSkillGuardian
from tools.domain_type_generator import DomainTypeGenerator
from tools.flyway_schema_contract_audit import FlywaySchemaContractAudit
from tools.frontend_contract_loader import FrontendFieldContractCompiler
from tools.frontend_contract_guardian import FrontendContractGuardian
from tools.frontend_field_audit import FrontendFieldAudit
from tools.frontend_operation_audit import FrontendOperationAudit
from tools.java_legacy_contract_audit import JavaLegacyContractAudit
from tools.openapi_component_generator import OpenApiComponentGenerator
from tools.rust_backend_architecture_guardian import RustBackendArchitectureGuardian
from tools.rust_route_overlap_audit import RustRouteOverlapAudit
from tools.schema_compiler import SchemaCompiler
from tools.schema_guardian import SchemaGuardian
from tools.schema_manifest import SchemaManifestGenerator


@dataclass(frozen=True)
class SchemaQualityGateResult:
    ok: bool
    messages: list[str]


class SchemaQualityGate:
    """Run every schema standard check that must pass before implementation generation."""

    def __init__(self, root: Path, registry_path: Path | None = None) -> None:
        self.root = Path(root).resolve()
        self.registry_path = (
            Path(registry_path).resolve()
            if registry_path is not None
            else self.root / "docs" / "schema-registry" / "sdkwork-clawrouter.tables.yaml"
        )

    def run(self) -> SchemaQualityGateResult:
        messages: list[str] = []

        guardian = SchemaGuardian(root=self.root, registry_path=self.registry_path).run()
        messages.extend(guardian.messages)

        compiler = SchemaCompiler(root=self.root, registry_path=self.registry_path).check_postgres()
        messages.extend(compiler.messages)

        domain_types = DomainTypeGenerator(root=self.root, registry_path=self.registry_path).check()
        messages.extend(domain_types.messages)

        manifest = SchemaManifestGenerator(root=self.root, registry_path=self.registry_path).check()
        messages.extend(manifest.messages)

        openapi_components = OpenApiComponentGenerator(root=self.root, registry_path=self.registry_path).check()
        messages.extend(openapi_components.messages)

        architecture_standard = ArchitectureStandardGuardian(root=self.root).run()
        messages.extend(architecture_standard.messages)

        rust_backend_architecture = RustBackendArchitectureGuardian(root=self.root).run()
        messages.extend(rust_backend_architecture.messages)

        rust_route_overlap = RustRouteOverlapAudit(root=self.root).run()
        messages.extend(rust_route_overlap.messages)

        frontend_contract_snapshot = FrontendFieldContractCompiler(root=self.root).check()
        messages.extend(frontend_contract_snapshot.messages)

        api_contract_manifest = ApiContractManifestGenerator(root=self.root).check()
        messages.extend(api_contract_manifest.messages)

        clawrouter_openapi = ClawRouterOpenApiGenerator(root=self.root).check()
        messages.extend(clawrouter_openapi.messages)

        clawrouter_gateway_openapi = ClawRouterGatewayOpenApiGenerator(root=self.root).check()
        messages.extend(clawrouter_gateway_openapi.messages)

        clawrouter_openapi_contract = ClawRouterOpenApiContractAudit(root=self.root).run()
        messages.extend(clawrouter_openapi_contract.messages)

        clawrouter_openapi_precision = ClawRouterOpenApiPrecisionAudit(root=self.root).run()
        messages.extend(clawrouter_openapi_precision.messages)

        clawrouter_payload_sdk = ClawRouterPayloadSdkAudit(root=self.root).run()
        messages.extend(clawrouter_payload_sdk.messages)

        clawrouter_sdk = ClawRouterSdkGuardian(root=self.root).run()
        messages.extend(clawrouter_sdk.messages)

        clawrouter_skills = ClawRouterSkillGuardian(root=self.root).run()
        messages.extend(clawrouter_skills.messages)

        java_legacy_audit = JavaLegacyContractAudit(root=self.root, registry_path=self.registry_path).check()
        messages.extend(java_legacy_audit.messages)

        flyway_contract_audit = FlywaySchemaContractAudit(root=self.root, registry_path=self.registry_path).run()
        messages.extend(flyway_contract_audit.messages)

        frontend_contract = FrontendContractGuardian(root=self.root).run()
        messages.extend(frontend_contract.messages)

        frontend_field_audit = FrontendFieldAudit(root=self.root).check()
        messages.extend(frontend_field_audit.messages)

        frontend_operation_audit = FrontendOperationAudit(root=self.root).check()
        messages.extend(frontend_operation_audit.messages)

        if (self.root / ".sdkwork" / "dependencies" / "sdkwork-appbase").exists():
            appbase_capability = AppbaseCapabilityGuardian(root=self.root).run()
            messages.extend(appbase_capability.messages)

        if (self.root / "specs" / "appbase-integration.yaml").exists():
            appbase_integration = AppbaseIntegrationGuardian(root=self.root).run()
            messages.extend(appbase_integration.messages)

            appbase_openapi_schema = AppbaseOpenApiSchemaGuardian(root=self.root).run()
            messages.extend(appbase_openapi_schema.messages)

        return SchemaQualityGateResult(ok=not messages, messages=messages)


def main() -> int:
    parser = argparse.ArgumentParser(description="Run sdkwork-clawrouter schema quality gates.")
    parser.add_argument("--root", type=Path, default=Path.cwd(), help="sdkwork-clawrouter root directory")
    parser.add_argument("--registry", type=Path, default=None, help="schema registry YAML path")
    args = parser.parse_args()

    result = SchemaQualityGate(root=args.root, registry_path=args.registry).run()
    if result.ok:
        print("Schema quality gate passed")
        return 0

    for message in result.messages:
        print(message)
    return 1


if __name__ == "__main__":
    raise SystemExit(main())
