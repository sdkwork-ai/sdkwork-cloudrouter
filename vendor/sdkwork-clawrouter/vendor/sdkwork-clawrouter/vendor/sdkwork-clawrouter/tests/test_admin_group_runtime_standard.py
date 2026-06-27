import json
import unittest
from pathlib import Path

from tools.api_contract_manifest import ApiContractManifestGenerator


ROOT = Path(__file__).resolve().parents[1]


class AdminGroupRuntimeStandardTest(unittest.TestCase):
    def test_admin_group_write_contracts_use_operation_specific_payloads(self) -> None:
        manifest = ApiContractManifestGenerator(root=ROOT).generate()
        operations = {operation["key"]: operation for operation in manifest["operations"]}

        add_group = operations[
            "apps/sdkwork-clawrouter-pc/packages/sdkwork-clawrouter-pc-admin-group/src/groupService.ts#addGroup"
        ]
        update_group = operations[
            "apps/sdkwork-clawrouter-pc/packages/sdkwork-clawrouter-pc-admin-group/src/groupService.ts#updateGroup"
        ]

        self.assertEqual("/backend/v3/api/ai/channel_groups", add_group["api_path"])
        self.assertEqual("AdminChannelGroupCreateRequest", add_group["request_schema"]["name"])
        self.assertEqual(
            ["groupName", "groupCode", "priceReferenceMode", "groupType", "status"],
            add_group["request_schema"]["schema"]["required"],
        )
        self.assertEqual("AdminChannelGroupMutationResponse", add_group["response_schema"]["name"])
        self.assertEqual(["item"], add_group["response_schema"]["schema"]["required"])

        self.assertEqual("/backend/v3/api/ai/channel_groups/{channelGroupId}", update_group["api_path"])
        self.assertEqual("AdminChannelGroupUpdateRequest", update_group["request_schema"]["name"])
        self.assertEqual([], update_group["request_schema"]["schema"]["required"])
        self.assertEqual("AdminChannelGroupMutationResponse", update_group["response_schema"]["name"])
        self.assertEqual(["item"], update_group["response_schema"]["schema"]["required"])

    def test_admin_group_frontend_and_backend_sdk_do_not_use_generic_write_payloads(self) -> None:
        service = (
            ROOT
            / "apps"
            / "sdkwork-clawrouter-pc"
            / "packages"
            / "sdkwork-clawrouter-pc-admin-group"
            / "src"
            / "groupService.ts"
        ).read_text(encoding="utf-8")
        ai_api = (
            ROOT / "sdks" / "clawrouter-backend-sdk" / "clawrouter-backend-sdk-typescript" / "src" / "api" / "ai.ts"
        ).read_text(encoding="utf-8")
        type_exports = (
            ROOT / "sdks" / "clawrouter-backend-sdk" / "clawrouter-backend-sdk-typescript" / "src" / "types" / "index.ts"
        ).read_text(encoding="utf-8")

        self.assertIn("static async fetchGroups(): Promise<GroupData[]>", service)
        self.assertIn("static async addGroup(group: GroupCreateInput): Promise<GroupData>", service)
        self.assertIn("static async updateGroup(id: string, updates: GroupUpdateInput): Promise<GroupData>", service)
        self.assertIn("toCreateGroupRequest", service)
        self.assertIn("toUpdateGroupRequest", service)
        self.assertIn("getClawRouterBackendSdkClient().ai.channelGroups.list()", service)
        self.assertIn("getClawRouterBackendSdkClient().ai.channelGroups.create(", service)
        self.assertIn("getClawRouterBackendSdkClient().ai.channelGroups.update(", service)
        self.assertIn("getClawRouterBackendSdkClient().ai.channelGroups.delete(", service)
        self.assertIn(
            "getClawRouterBackendSdkClient().ai.channelGroups.channelBindings.list(",
            service,
        )
        self.assertIn(
            "getClawRouterBackendSdkClient().ai.channelGroups.channelBindings.update(",
            service,
        )
        self.assertNotIn(".http.request<", service)
        self.assertNotIn("BACKEND_API_PREFIX", service)
        self.assertNotIn("AI_CHANNEL_GROUPS_PATH", service)
        self.assertNotIn("type BackendChannelGroupCreateRequest", service)
        self.assertNotIn("type BackendChannelGroupUpdateRequest", service)

        self.assertIn("AdminChannelGroupCreateRequest", ai_api)
        self.assertIn("AdminChannelGroupUpdateRequest", ai_api)
        self.assertIn("ChannelGroupsCreateResult", ai_api)
        self.assertIn("ChannelGroupsUpdateResult", ai_api)
        self.assertIn("ChannelGroupsDeleteResult", ai_api)
        self.assertIn("ChannelGroupsChannelBindingsListResult", ai_api)
        self.assertIn("ChannelGroupsChannelBindingsUpdateResult", ai_api)
        self.assertIn(
            "async create(body: AdminChannelGroupCreateRequest): Promise<ChannelGroupsCreateResult>",
            ai_api,
        )
        self.assertIn(
            "async update(channelGroupId: string, body: AdminChannelGroupUpdateRequest): Promise<ChannelGroupsUpdateResult>",
            ai_api,
        )
        self.assertIn(
            "async delete(channelGroupId: string): Promise<ChannelGroupsDeleteResult>",
            ai_api,
        )
        self.assertIn("public readonly channelGroups: AiChannelGroupsApi;", ai_api)
        self.assertNotIn("access" + "Groups", ai_api)
        self.assertNotIn("Admin" + "Access" + "Group", ai_api)
        self.assertNotIn("router/channel_groups", ai_api)
        self.assertNotIn("headers?: Record<string, string>", ai_api)

        self.assertIn("export type { AdminChannelGroupCreateRequest }", type_exports)
        self.assertIn("export type { AdminChannelGroupUpdateRequest }", type_exports)
        self.assertIn("export type { AdminChannelGroupMutationResponse }", type_exports)
        self.assertIn("export type { ChannelGroupsCreateResult }", type_exports)
        self.assertIn("export type { ChannelGroupsUpdateResult }", type_exports)
        self.assertIn("export type { ChannelGroupsDeleteResult }", type_exports)

    def test_admin_group_channel_binding_contract_uses_resource_scope_not_direct_models(self) -> None:
        manifest = ApiContractManifestGenerator(root=ROOT).generate()
        operations = {operation["key"]: operation for operation in manifest["operations"]}
        source = "apps/sdkwork-clawrouter-pc/packages/sdkwork-clawrouter-pc-admin-group/src/groupService.ts"
        list_bindings = operations[f"{source}#fetchGroupChannelBindings"]
        update_bindings = operations[f"{source}#replaceGroupChannelBindings"]

        binding_item = (
            list_bindings["response_schema"]["schema"]["properties"]["items"]["items"]
        )
        self.assertNotIn("models", binding_item["required"])
        self.assertNotIn("modelScope", binding_item["required"])
        self.assertNotIn("models", binding_item["properties"])
        self.assertNotIn("modelScope", binding_item["properties"])
        self.assertIn("resourceCodes", binding_item["required"])
        self.assertIn("apiScope", binding_item["required"])
        self.assertIn("resourceCodes", binding_item["properties"])
        self.assertIn("apiScope", binding_item["properties"])

        binding_input = (
            update_bindings["request_schema"]["schema"]["properties"]["items"]["items"]
        )
        self.assertNotIn("modelScope", binding_input["properties"])
        self.assertNotIn("models", binding_input["properties"])
        self.assertIn("resourceCodes", binding_input["properties"])
        self.assertIn("apiScope", binding_input["properties"])

        contract = (
            ROOT / "docs" / "schema-registry" / "frontend-field-contracts.yaml"
        ).read_text(encoding="utf-8")
        group_section = contract[
            contract.index("interface: GroupChannelBindingData") :
            contract.index("interface: GroupResourceGroupOption")
        ]
        self.assertNotIn("- models", group_section)
        self.assertNotIn("- modelScope", group_section)
        self.assertIn("- resourceCodes", group_section)
        self.assertIn("- apiScope", group_section)

        sdk_item = (
            ROOT
            / "sdks"
            / "clawrouter-backend-sdk"
            / "clawrouter-backend-sdk-typescript"
            / "src"
            / "types"
            / "admin-channel-group-channel-binding-item.ts"
        ).read_text(encoding="utf-8")
        sdk_input = (
            ROOT
            / "sdks"
            / "clawrouter-backend-sdk"
            / "clawrouter-backend-sdk-typescript"
            / "src"
            / "types"
            / "admin-channel-group-channel-binding-input.ts"
        ).read_text(encoding="utf-8")
        self.assertNotIn("models", sdk_item)
        self.assertNotIn("modelScope", sdk_item + sdk_input)
        self.assertIn("resourceCodes: string[]", sdk_item)
        self.assertIn("apiScope: string[]", sdk_item)
        self.assertIn("resourceCodes?: string[]", sdk_input)
        self.assertIn("apiScope?: string[]", sdk_input)

    def test_admin_group_channel_binding_drawer_lists_only_current_group_bindings(self) -> None:
        view = (
            ROOT
            / "apps"
            / "sdkwork-clawrouter-pc"
            / "packages"
            / "sdkwork-clawrouter-pc-admin-group"
            / "src"
            / "index.tsx"
        ).read_text(encoding="utf-8")

        for marker in [
            "data-admin-group-channel-bindings-drawer",
            "data-admin-group-channel-bindings-toolbar",
            "data-admin-group-channel-binding-search",
            "data-admin-group-channel-binding-add",
            "data-admin-group-channel-binding-remove",
            "data-admin-group-channel-picker-modal",
            "visibleBindingRows",
            "openChannelBindingPicker",
            "addSelectedChannelBindings",
            "removeChannelBindingDraft",
            "pickerChannelOptions",
            "w-[90vw]",
            "h-full",
        ]:
            self.assertIn(marker, view)

        self.assertIn("<aside data-admin-group-channel-bindings-drawer", view)
        self.assertIn("fixed inset-0 z-50 flex justify-start", view)
        self.assertNotIn("data-admin-group-channel-bindings-modal", view)
        self.assertNotIn("orderedChannelOptions.map", view)
        self.assertNotIn("toggleChannelBinding", view)
        self.assertNotIn("columns.enabled", view)

    def test_admin_group_frontend_uses_standard_domain_values_without_mojibake(self) -> None:
        package = (
            ROOT
            / "apps"
            / "sdkwork-clawrouter-pc"
            / "packages"
            / "sdkwork-clawrouter-pc-admin-group"
            / "src"
        )
        service = (package / "groupService.ts").read_text(encoding="utf-8")
        view = (package / "index.tsx").read_text(encoding="utf-8")

        mojibake_marker_codepoints = [0x934F, 0x6D93, 0x59DD, 0x5BEE, 0x00E9, 0x00E6, 0x00E7]
        for token in (chr(codepoint) for codepoint in mojibake_marker_codepoints):
            self.assertNotIn(token, service)
            self.assertNotIn(token, view)

        combined_source = service + view + (package / "groupForm.ts").read_text(encoding="utf-8")
        for token in [
            "type: 'public' | 'dedicated'",
            "status: 'active' | 'disabled'",
            "return type === 'dedicated' ? 'dedicated' : 'public'",
            "return status === 'disabled' ? 'disabled' : 'active'",
            "status: 'active'",
        ]:
            self.assertIn(token, combined_source)
        self.assertNotIn("type: formData.get('isPublic') ? 'public' : 'dedicated'", combined_source)

    def test_admin_group_create_form_uses_dedicated_input_without_client_fake_ids(self) -> None:
        package_root = (
            ROOT
            / "apps"
            / "sdkwork-clawrouter-pc"
            / "packages"
            / "sdkwork-clawrouter-pc-admin-group"
        )
        package = json.loads((package_root / "package.json").read_text(encoding="utf-8"))
        service = (package_root / "src" / "groupService.ts").read_text(encoding="utf-8")
        view = (package_root / "src" / "index.tsx").read_text(encoding="utf-8")
        form = (package_root / "src" / "groupForm.ts").read_text(encoding="utf-8")
        verifier = (ROOT / "scripts" / "verify-claw-router-application.mjs").read_text(encoding="utf-8")

        self.assertEqual(package["type"], "module")
        self.assertEqual(package["scripts"]["typecheck"], "tsc --noEmit")
        self.assertIn("export type GroupCreateInput", service)
        self.assertIn("export type GroupUpdateInput", service)
        self.assertIn("static async addGroup(group: GroupCreateInput): Promise<GroupData>", service)
        self.assertIn("static async updateGroup(id: string, updates: GroupUpdateInput): Promise<GroupData>", service)
        self.assertIn("readRequiredApiItem(result, 'Updated group response is missing data')", service)
        self.assertIn("function toCreateGroupRequest(group: GroupCreateInput)", service)
        self.assertIn("function toUpdateGroupRequest(updates: GroupUpdateInput)", service)
        self.assertNotIn("Partial<GroupData", service)
        self.assertNotIn("platform:", service)
        self.assertNotIn("billingType", service)
        self.assertIn("createGroupInputFromForm", view)
        self.assertIn("GroupService.addGroup(createGroupInputFromForm(formData))", view)
        self.assertNotIn("Date.now()", view)
        self.assertNotIn("Math.random()", view)
        self.assertNotIn("const newGroup: GroupData", view)
        self.assertIn("export function createGroupInputFromForm", form)
        self.assertIn("export function createGroupUpdateInputFromForm", form)
        self.assertNotIn("Date.now()", form)
        self.assertNotIn("Math.random()", form)
        self.assertIn("admin-group-runtime.test.ts", verifier)

    def test_admin_group_read_model_uses_canonical_public_fields_without_public_billing_type(self) -> None:
        store_paths = [
            "services/sdkwork-clawrouter-router-service/src/infrastructure/sql/sqlite/admin_channel_group_store.rs",
            "services/sdkwork-clawrouter-router-service/src/infrastructure/sql/postgres/admin_channel_group_store.rs",
        ]

        for relative_path in store_paths:
            store = (ROOT / relative_path).read_text(encoding="utf-8")
            compact_store = " ".join(store.split())
            with self.subTest(store=relative_path):
                self.assertIn(
                    'group_code: row.try_get("group_code").map_err(row_error)?',
                    compact_store,
                )
                self.assertIn(
                    'group_name: row.try_get("group_name").map_err(row_error)?',
                    compact_store,
                )
                self.assertIn(
                    'provider_code: row.try_get("provider_code").map_err(row_error)?',
                    compact_store,
                )
                self.assertIn(
                    'price_reference_mode: price_reference_mode_label(required_integer_cell(',
                    compact_store,
                )
                self.assertIn(
                    "fn group_type_cell",
                    compact_store,
                )
                self.assertIn(
                    "fn status_label(value: i64) -> DomainResult<String>",
                    compact_store,
                )
                self.assertIn("missing admin channel group price_reference_mode from database row", store)
                self.assertIn("missing admin channel group group_type from database row", store)
                self.assertIn("missing admin channel group status from database row", store)
                self.assertIn("invalid admin channel group price_reference_mode from database row", store)
                self.assertIn("invalid admin channel group group_type from database row", store)
                self.assertNotIn("billingType", store)
                self.assertNotIn("platform:", store)


if __name__ == "__main__":
    unittest.main()
