import tempfile
import textwrap
import unittest
from pathlib import Path

from tools.domain_type_generator import DomainTypeGenerationError, DomainTypeGenerator


class DomainTypeGeneratorTest(unittest.TestCase):
    def write_registry(self, root: Path, content: str) -> Path:
        registry = root / "docs" / "schema-registry" / "sdkwork-clawrouter.tables.yaml"
        registry.parent.mkdir(parents=True, exist_ok=True)
        registry.write_text(textwrap.dedent(content).strip() + "\n", encoding="utf-8")
        return registry

    def test_generates_java_enum_with_stable_string_codes(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            registry = self.write_registry(
                root,
                """
                domain_names:
                  model_vendor:
                    canonical_name: ModelVendor
                    type_bindings:
                      java: com.sdkwork.claw.router.domain.enums.ModelVendor
                    builtin_values:
                      - { code: openai, java: OPENAI, rust: OpenAi, label: OpenAI }
                      - { code: unknown, java: UNKNOWN, rust: Unknown, label: Unknown Vendor }
                """,
            )

            files = DomainTypeGenerator(root=root, registry_path=registry).generate()
            java_source = files[root / "generated" / "types" / "java" / "com" / "sdkwork" / "claw" / "router" / "domain" / "enums" / "ModelVendor.java"]

            self.assertIn("package com.sdkwork.claw.router.domain.enums;", java_source)
            self.assertIn("OPENAI(\"openai\")", java_source)
            self.assertIn("UNKNOWN(\"unknown\")", java_source)
            self.assertIn("public static ModelVendor fromCode(String code)", java_source)
            self.assertIn("return UNKNOWN;", java_source)

    def test_generates_rust_typescript_and_openapi_defs(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            registry = self.write_registry(
                root,
                """
                domain_names:
                  billing_meter:
                    canonical_name: BillingMeter
                    type_bindings:
                      rust: sdkwork_claw_router::domain::BillingMeter
                      typescript: BillingMeter
                      openapi: BillingMeter
                    builtin_values:
                      - { code: llm_input_token, java: LLM_INPUT_TOKEN, rust: LlmInputToken, label: LLM Input Token }
                      - { code: api_result, java: API_RESULT, rust: ApiResult, label: API Result }
                      - { code: unknown, java: UNKNOWN, rust: Unknown, label: Unknown }
                """,
            )

            files = DomainTypeGenerator(root=root, registry_path=registry).generate()
            rust_source = files[root / "generated" / "types" / "rust" / "domain.rs"]
            ts_source = files[root / "generated" / "types" / "typescript" / "domain-types.ts"]
            openapi_source = files[root / "generated" / "types" / "openapi" / "domain-types.yaml"]

            self.assertIn("pub enum BillingMeter", rust_source)
            self.assertIn("LlmInputToken", rust_source)
            self.assertIn("ApiResult", rust_source)
            self.assertIn("export const BILLING_METER_VALUES", ts_source)
            self.assertIn("\"llm_input_token\"", ts_source)
            self.assertIn("\"unknown\"", ts_source)
            self.assertIn("export type BillingMeter", ts_source)
            self.assertIn("BillingMeter:", openapi_source)
            self.assertIn("- llm_input_token", openapi_source)

    def test_generates_stable_int_code_helpers_for_int_persisted_domain(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            registry = self.write_registry(
                root,
                """
                domain_names:
                  integration_provider_type:
                    canonical_name: IntegrationProviderType
                    persistence:
                      store_as: stable_int_code
                    type_bindings:
                      java: com.sdkwork.claw.router.domain.enums.IntegrationProviderType
                      rust: sdkwork_claw_router::domain::IntegrationProviderType
                    builtin_values:
                      - { code: unknown, java: UNKNOWN, rust: Unknown, int_code: 0, label: Unknown }
                      - { code: cloud_platform, java: CLOUD_PLATFORM, rust: CloudPlatform, int_code: 2, label: Cloud platform }
                      - { code: relay_aggregator, java: RELAY_AGGREGATOR, rust: RelayAggregator, int_code: 3, label: Relay }
                """,
            )

            files = DomainTypeGenerator(root=root, registry_path=registry).generate()
            java_source = files[root / "generated" / "types" / "java" / "com" / "sdkwork" / "claw" / "router" / "domain" / "enums" / "IntegrationProviderType.java"]
            rust_source = files[root / "generated" / "types" / "rust" / "domain.rs"]

            self.assertIn('UNKNOWN("unknown", 0)', java_source)
            self.assertIn('CLOUD_PLATFORM("cloud_platform", 2)', java_source)
            self.assertIn("public int getIntCode()", java_source)
            self.assertIn("public static IntegrationProviderType fromIntCode(int intCode)", java_source)
            self.assertIn("pub fn int_code(&self) -> i32", rust_source)
            self.assertIn("pub fn try_from_int_code(code: i32) -> Option<Self>", rust_source)
            self.assertIn("Self::CloudPlatform => 2", rust_source)
            self.assertIn("3 => Some(Self::RelayAggregator)", rust_source)

    def test_rejects_stable_int_domain_without_explicit_unique_int_codes(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            registry = self.write_registry(
                root,
                """
                domain_names:
                  integration_provider_type:
                    canonical_name: IntegrationProviderType
                    persistence:
                      store_as: stable_int_code
                    type_bindings:
                      rust: sdkwork_claw_router::domain::IntegrationProviderType
                    builtin_values:
                      - { code: unknown, rust: Unknown, int_code: 0, label: Unknown }
                      - { code: relay_aggregator, rust: RelayAggregator, int_code: 0, label: Relay }
                      - { code: cloud_platform, rust: CloudPlatform, label: Cloud platform }
                """,
            )

            with self.assertRaisesRegex(
                DomainTypeGenerationError,
                "integration_provider_type.relay_aggregator duplicates int_code 0",
            ):
                DomainTypeGenerator(root=root, registry_path=registry).generate()

    def test_rejects_generated_domain_without_unknown_value(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            registry = self.write_registry(
                root,
                """
                domain_names:
                  billing_meter:
                    canonical_name: BillingMeter
                    type_bindings:
                      java: com.sdkwork.claw.router.domain.enums.BillingMeter
                    builtin_values:
                      - { code: llm_input_token, java: LLM_INPUT_TOKEN, rust: LlmInputToken, label: LLM Input Token }
                """,
            )

            with self.assertRaisesRegex(
                DomainTypeGenerationError,
                "billing_meter generated domain types must include unknown",
            ):
                DomainTypeGenerator(root=root, registry_path=registry).generate()

    def test_writes_generated_files(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            registry = self.write_registry(
                root,
                """
                domain_names:
                  model_vendor:
                    canonical_name: ModelVendor
                    type_bindings:
                      java: com.sdkwork.claw.router.domain.enums.ModelVendor
                      rust: sdkwork_claw_router::domain::ModelVendor
                      typescript: ModelVendor
                      openapi: ModelVendor
                    builtin_values:
                      - { code: openai, java: OPENAI, rust: OpenAi, label: OpenAI }
                      - { code: unknown, java: UNKNOWN, rust: Unknown, label: Unknown Vendor }
                """,
            )
            generator = DomainTypeGenerator(root=root, registry_path=registry)

            written = generator.write()

            self.assertIn(root / "generated" / "types" / "java" / "com" / "sdkwork" / "claw" / "router" / "domain" / "enums" / "ModelVendor.java", written)
            self.assertTrue((root / "generated" / "types" / "rust" / "domain.rs").exists())
            self.assertTrue((root / "generated" / "types" / "typescript" / "domain-types.ts").exists())
            self.assertTrue((root / "generated" / "types" / "openapi" / "domain-types.yaml").exists())

    def test_check_reports_stale_generated_types(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            registry = self.write_registry(
                root,
                """
                domain_names:
                  model_vendor:
                    canonical_name: ModelVendor
                    type_bindings:
                      java: com.sdkwork.claw.router.domain.enums.ModelVendor
                    builtin_values:
                      - { code: openai, java: OPENAI, rust: OpenAi, label: OpenAI }
                      - { code: unknown, java: UNKNOWN, rust: Unknown, label: Unknown Vendor }
                """,
            )
            stale = root / "generated" / "types" / "java" / "com" / "sdkwork" / "claw" / "router" / "domain" / "enums" / "ModelVendor.java"
            stale.parent.mkdir(parents=True, exist_ok=True)
            stale.write_text("// stale\n", encoding="utf-8")

            result = DomainTypeGenerator(root=root, registry_path=registry).check()

            self.assertFalse(result.ok)
            self.assertIn(f"generated domain type is stale: {stale}", result.messages)

    def test_check_accepts_fresh_generated_types(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            registry = self.write_registry(
                root,
                """
                domain_names:
                  model_vendor:
                    canonical_name: ModelVendor
                    type_bindings:
                      java: com.sdkwork.claw.router.domain.enums.ModelVendor
                    builtin_values:
                      - { code: openai, java: OPENAI, rust: OpenAi, label: OpenAI }
                      - { code: unknown, java: UNKNOWN, rust: Unknown, label: Unknown Vendor }
                """,
            )
            generator = DomainTypeGenerator(root=root, registry_path=registry)
            generator.write()

            result = generator.check()

            self.assertTrue(result.ok, result.messages)


if __name__ == "__main__":
    unittest.main()
