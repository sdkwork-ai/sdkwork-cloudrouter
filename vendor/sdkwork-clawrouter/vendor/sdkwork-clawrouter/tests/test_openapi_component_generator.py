import tempfile
import textwrap
import unittest
from pathlib import Path

from tools.openapi_component_generator import OpenApiComponentGenerator


class OpenApiComponentGeneratorTest(unittest.TestCase):
    def write_registry(self, root: Path, content: str) -> Path:
        registry = root / "docs" / "schema-registry" / "sdkwork-clawrouter.tables.yaml"
        registry.parent.mkdir(parents=True, exist_ok=True)
        registry.write_text(textwrap.dedent(content).strip() + "\n", encoding="utf-8")
        return registry

    def test_generates_openapi_components_for_table_columns(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            registry = self.write_registry(
                root,
                """
                schema_registry:
                  common_column_groups:
                    tenant_entity: [id, uuid, tenant_id, status, created_at, metadata]
                tables:
                  - table: ai_model_vendor
                    domain: ai
                    common_columns: tenant_entity
                    columns:
                      vendor_code: string(64)
                      enabled: bool
                      sort_order: int32
                      usage_count: int64
                      unit_price: decimal
                      published_at: instant
                      capabilities: json
                      vendor_type: enum_int32
                """,
            )

            source = OpenApiComponentGenerator(root=root, registry_path=registry).render_yaml()

            self.assertIn("AiModelVendorRecord:", source)
            self.assertIn("x-table: ai_model_vendor", source)
            self.assertIn("vendor_code:", source)
            self.assertIn("maxLength: 64", source)
            self.assertIn("enabled:\n          type: boolean", source)
            self.assertIn("usage_count:\n          type: string\n          format: int64", source)
            self.assertIn("pattern: ^-?[0-9]+$", source)
            self.assertIn("x-sdkwork-int64-string: true", source)
            self.assertIn("x-sdkwork-rust-type: i64", source)
            self.assertIn("unit_price:\n          type: string\n          format: decimal", source)
            self.assertIn("published_at:\n          type: string\n          format: date-time", source)
            self.assertIn("capabilities:\n          type: object\n          additionalProperties: true", source)
            self.assertIn("vendor_type:\n          type: string\n          x-db-type: enum_int32", source)

    def test_marks_not_null_columns_as_required_openapi_properties(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            registry = self.write_registry(
                root,
                """
                tables:
                  - table: ai_model_vendor
                    domain: ai
                    not_null_columns: [vendor_code, enabled, physical_only_column]
                    columns:
                      vendor_code: string(64)
                      enabled: bool
                      optional_note: text
                """,
            )

            source = OpenApiComponentGenerator(root=root, registry_path=registry).render_yaml()

            self.assertIn("required:\n      - vendor_code\n      - enabled", source)
            self.assertNotIn("physical_only_column", source)

    def test_generates_media_resource_standard_components(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            registry = self.write_registry(
                root,
                """
                tables: []
                """,
            )

            source = OpenApiComponentGenerator(root=root, registry_path=registry).render_yaml()

            self.assertIn("MediaResource:", source)
            self.assertIn("MediaKind:", source)
            self.assertIn("MediaSource:", source)
            self.assertIn("objectBlobId:", source)
            self.assertIn("access:\n          $ref: '#/components/schemas/MediaAccess'", source)
            self.assertIn("ai:\n          $ref: '#/components/schemas/MediaAiProvenance'", source)

    def test_projects_media_resource_snapshot_columns_to_logical_media_fields(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            registry = self.write_registry(
                root,
                """
                tables:
                  - table: ai_agent_skill_package
                    domain: legacy
                    frontend_contract:
                      field_mapping:
                        icon: icon_resource_snapshot MediaResource
                        image: cover MediaResource or icon MediaResource
                    columns:
                      name:
                        type: string(255)
                      icon_media_resource_id: string(128)
                      icon_object_blob_id: int64
                      icon_resource_snapshot: json
                      cover_media_resource_id: string(128)
                      cover_object_blob_id: int64
                      cover_resource_snapshot: json
                """,
            )

            source = OpenApiComponentGenerator(root=root, registry_path=registry).render_yaml()

            self.assertIn("PlusAgentSkillPackageRecord:", source)
            self.assertIn("name:\n          type: string\n          maxLength: 255", source)
            self.assertIn("icon:\n          $ref: '#/components/schemas/MediaResource'", source)
            self.assertIn("cover:\n          $ref: '#/components/schemas/MediaResource'", source)
            self.assertNotIn("image:\n          $ref: '#/components/schemas/MediaResource'", source)
            self.assertNotIn("icon_media_resource_id:", source)
            self.assertNotIn("icon_object_blob_id:", source)
            self.assertNotIn("icon_resource_snapshot:", source)
            self.assertNotIn("cover_media_resource_id:", source)
            self.assertNotIn("cover_object_blob_id:", source)
            self.assertNotIn("cover_resource_snapshot:", source)

    def test_writes_and_checks_components(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            registry = self.write_registry(
                root,
                """
                tables:
                  - table: ai_model_vendor
                    domain: ai
                    columns:
                      vendor_code: string(64)
                """,
            )
            generator = OpenApiComponentGenerator(root=root, registry_path=registry)
            output = generator.write()

            self.assertTrue(output.exists())
            self.assertTrue(generator.check().ok)

    def test_check_reports_stale_components(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            registry = self.write_registry(
                root,
                """
                tables:
                  - table: ai_model_vendor
                    domain: ai
                    columns:
                      vendor_code: string(64)
                """,
            )
            output = root / "generated" / "openapi" / "schema-components.yaml"
            output.parent.mkdir(parents=True, exist_ok=True)
            output.write_text("components: {}\n", encoding="utf-8")

            result = OpenApiComponentGenerator(root=root, registry_path=registry).check()

            self.assertFalse(result.ok)
            self.assertIn(f"openapi schema components are stale: {output}", result.messages)


if __name__ == "__main__":
    unittest.main()
