import unittest
from pathlib import Path

import yaml

from tools.api_contract_manifest import ApiContractManifestGenerator


ROOT = Path(__file__).resolve().parents[1]
MODEL_SERVICE_SOURCE = (
    "data/sdkwork-models/apps/sdkwork-models-pc/packages/"
    "sdkwork-models-pc-admin-catalog/src/modelService.ts"
)


class AdminModelMappingRuntimeStandardTest(unittest.TestCase):
    def test_model_mapping_schema_and_contract_follow_rule_with_items_design(self) -> None:
        manifest = ApiContractManifestGenerator(root=ROOT).generate()
        operations = {operation["key"]: operation for operation in manifest["operations"]}
        contract = yaml.safe_load(
            (ROOT / "docs/schema-registry/frontend-field-contracts.yaml").read_text(
                encoding="utf-8"
            )
        )
        table_items = []
        for registry_path in sorted((ROOT / "docs/schema-registry/tables").glob("*.yaml")):
            registry = yaml.safe_load(registry_path.read_text(encoding="utf-8"))
            table_items.extend(registry.get("tables", []))
        tables = {item["table"]: item for item in table_items}

        self.assertIn("ai_model_mapping_rule", tables)
        self.assertIn("ai_model_mapping_rule_item", tables)
        self.assertIn("ai_model_mapping_rule_binding", tables)
        mapping_table = tables["ai_model_mapping_rule"]
        mapping_item_table = tables["ai_model_mapping_rule_item"]
        mapping_binding_table = tables["ai_model_mapping_rule_binding"]
        self.assertEqual("ai", mapping_table["domain"])
        self.assertIn("/admin/model/mappings", mapping_table["frontend_routes"])
        self.assertIn("backend", mapping_table["api_surfaces"])
        self.assertIn("worker", mapping_table["api_surfaces"])

        columns = mapping_table["columns"]
        for field_name in [
            "source_vendor_id",
            "source_vendor_code",
            "target_vendor_id",
            "target_vendor_code",
            "mapping_mode",
            "match_type",
            "enabled",
            "metadata",
        ]:
            self.assertIn(field_name, columns)
        for field_name in [
            "source_model",
            "target_model",
            "scope_type",
            "vendor_id",
            "vendor_code",
            "channel_id",
            "channel_code",
            "priority",
            "effective_from",
            "effective_to",
            "description",
        ]:
            self.assertNotIn(
                field_name,
                columns,
                f"{field_name} belongs to ai_model_mapping_rule_item or was removed from rule",
            )

        item_columns = mapping_item_table["columns"]
        for field_name in [
            "rule_id",
            "rule_uuid",
            "source_model",
            "source_catalog_key",
            "target_model",
            "target_catalog_key",
            "target_provider_model",
            "target_provider_native_model",
            "sort_order",
            "enabled",
            "metadata",
        ]:
            self.assertIn(field_name, item_columns)

        index_names = {index["name"] for index in mapping_table["indexes"]}
        for index_name in [
            "idx_ai_model_mapping_rule_source_vendor",
            "idx_ai_model_mapping_rule_target_vendor",
            "idx_ai_model_mapping_rule_enabled",
        ]:
            self.assertIn(index_name, index_names)
        item_index_names = {index["name"] for index in mapping_item_table["indexes"]}
        for index_name in [
            "idx_ai_model_mapping_rule_item_rule_lookup",
            "idx_ai_model_mapping_rule_item_source_lookup",
            "idx_ai_model_mapping_rule_item_target_lookup",
        ]:
            self.assertIn(index_name, item_index_names)

        binding_columns = mapping_binding_table["columns"]
        for field_name in [
            "rule_id",
            "rule_uuid",
            "binding_type",
            "binding_id",
            "binding_code",
            "binding_name_snapshot",
            "sort_order",
            "enabled",
            "metadata",
        ]:
            self.assertIn(field_name, binding_columns)
        binding_index_names = {index["name"] for index in mapping_binding_table["indexes"]}
        binding_constraint_names = {
            constraint["name"]
            for constraint in mapping_binding_table.get("unique_constraints", [])
            if "name" in constraint
        }
        self.assertIn(
            "uk_ai_model_mapping_rule_binding_target",
            binding_constraint_names,
        )
        for index_name in [
            "idx_ai_model_mapping_rule_binding_rule_lookup",
            "idx_ai_model_mapping_rule_binding_target_lookup",
            "idx_ai_model_mapping_rule_binding_channel_group_lookup",
            "idx_ai_model_mapping_rule_binding_vendor_lookup",
            "idx_ai_model_mapping_rule_binding_global_lookup",
        ]:
            self.assertIn(index_name, binding_index_names)

        expected_operation_paths = {
            f"{MODEL_SERVICE_SOURCE}#fetchModelMappings@/admin/model/mappings": "/backend/v3/api/ai/model_mappings",
            f"{MODEL_SERVICE_SOURCE}#createModelMapping@/admin/model/mappings": "/backend/v3/api/ai/model_mappings",
            f"{MODEL_SERVICE_SOURCE}#updateModelMapping@/admin/model/mappings": "/backend/v3/api/ai/model_mappings/{mappingId}",
            f"{MODEL_SERVICE_SOURCE}#deleteModelMapping@/admin/model/mappings": "/backend/v3/api/ai/model_mappings/{mappingId}",
            f"{MODEL_SERVICE_SOURCE}#resolveModelMapping@/admin/model/mappings": "/backend/v3/api/ai/model_mappings/resolve",
        }
        for operation_key, expected_path in expected_operation_paths.items():
            self.assertIn(operation_key, operations)
            self.assertEqual(expected_path, operations[operation_key]["api_path"])
            self.assertEqual("backend", operations[operation_key]["api_surface"])

        frontend_models = contract["frontend_models"]
        mapping_interfaces = {
            item["interface"]: item
            for item in frontend_models
            if item.get("source") == MODEL_SERVICE_SOURCE
            and item.get("route") == "/admin/model/mappings"
        }
        for interface_name in [
            "ModelMappingRule",
            "ModelMappingRuleItem",
            "ModelMappingRuleBinding",
            "ModelMappingCreateInput",
            "ModelMappingUpdateInput",
            "ModelMappingResolveInput",
            "ModelMappingResolveResult",
        ]:
            self.assertIn(interface_name, mapping_interfaces)
            self.assertIn("ai_model_mapping_rule", mapping_interfaces[interface_name]["data_sources"])
        self.assertIn(
            "ai_model_mapping_rule_item",
            mapping_interfaces["ModelMappingRuleItem"]["data_sources"],
        )
        self.assertIn(
            "ai_model_mapping_rule_item",
            mapping_interfaces["ModelMappingRule"]["data_sources"],
        )
        self.assertIn(
            "ai_model_mapping_rule_binding",
            mapping_interfaces["ModelMappingRuleBinding"]["data_sources"],
        )
        self.assertIn(
            "ai_model_mapping_rule_binding",
            mapping_interfaces["ModelMappingRule"]["data_sources"],
        )

        model_service = (ROOT / MODEL_SERVICE_SOURCE).read_text(encoding="utf-8")
        self.assertIn("mappingItems", model_service)
        self.assertIn("bindings", model_service)
        model_mapping_rule_block = model_service.split(
            "export interface ModelMappingRule {", 1
        )[1].split("\n}\n\nexport type ModelMappingBindingType", 1)[0]
        self.assertNotIn("sourceModel", model_mapping_rule_block)
        self.assertNotIn("sourceCatalogKey", model_mapping_rule_block)
        self.assertNotIn("targetModel", model_mapping_rule_block)
        self.assertNotIn("targetCatalogKey", model_mapping_rule_block)
        self.assertIn("bindingType", model_service)
        self.assertIn("matchedBindingType", model_service)
        self.assertNotIn("scopeType", model_service)
        self.assertNotIn("matchedScopeType", model_service)

        backend_contract = (
            ROOT
            / "docs"
            / "schema-registry"
            / "frontend-field-contracts"
            / "operations"
            / "backend-ai.yaml"
        ).read_text(encoding="utf-8")
        mapping_contract = backend_contract.split("operation: fetchModelMappings", 1)[1].split(
            "- route: /admin/model/mappings", 1
        )[0]
        resolve_contract = backend_contract.split("operation: resolveModelMapping", 1)[1].split(
            "- route: ", 1
        )[0]
        self.assertIn("binding_type", mapping_contract)
        self.assertIn("bindingType", mapping_contract)
        self.assertNotIn("scope_type", mapping_contract)
        self.assertNotIn("scopeType", mapping_contract)
        self.assertIn("matchedBindingType", resolve_contract)
        self.assertNotIn("matchedScopeType", resolve_contract)

    def test_model_mapping_design_plan_is_recorded(self) -> None:
        spec_path = ROOT / "docs/superpowers/specs/2026-06-02-admin-model-mapping-design.md"
        plan_path = ROOT / "docs/superpowers/plans/2026-06-02-admin-model-mapping.md"
        self.assertTrue(spec_path.exists())
        self.assertTrue(plan_path.exists())
        spec = spec_path.read_text(encoding="utf-8")
        plan = plan_path.read_text(encoding="utf-8")
        for text in [spec, plan]:
            self.assertIn("ai_model_mapping_rule", text)
            self.assertIn("ai_model_mapping_rule_item", text)
            self.assertIn("ai_model_mapping_rule_binding", text)
            self.assertIn("mappingItems", text)
            self.assertIn("provider_account > channel > channel_group > vendor > global", text)
            self.assertIn("/admin/model/mappings", text)


if __name__ == "__main__":
    unittest.main()
