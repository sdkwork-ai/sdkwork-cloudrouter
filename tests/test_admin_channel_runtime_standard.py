import unittest
import json
from pathlib import Path

from tools.api_contract_manifest import ApiContractManifestGenerator


ROOT = Path(__file__).resolve().parents[1]


class AdminChannelRuntimeStandardTest(unittest.TestCase):
    def test_admin_channel_contracts_use_operation_specific_payloads(self) -> None:
        manifest = ApiContractManifestGenerator(root=ROOT).generate()
        operations = {operation["key"]: operation for operation in manifest["operations"]}
        source = "apps/sdkwork-clawrouter-pc/packages/sdkwork-clawrouter-pc-admin-channel/src/channelService.ts"

        fetch_channels = operations[f"{source}#fetchChannels"]
        add_channel = operations[f"{source}#addChannel"]
        update_channel = operations[f"{source}#updateChannel"]
        test_channel = operations[f"{source}#testChannel"]
        fetch_provider_secrets = operations[f"{source}#fetchProviderSecrets"]
        add_provider_secret = operations[f"{source}#addProviderSecret"]
        update_provider_secret = operations[f"{source}#updateProviderSecret"]

        self.assertIsNone(fetch_channels.get("request_schema"))

        self.assertEqual("AdminChannelCreateRequest", add_channel["request_schema"]["name"])
        self.assertEqual(["name", "vendor", "credentials"], add_channel["request_schema"]["schema"]["required"])
        self.assertNotIn("models", add_channel["request_schema"]["schema"]["properties"])
        credentials = add_channel["request_schema"]["schema"]["properties"]["credentials"]
        self.assertEqual("array", credentials["type"])
        credential_item = credentials["items"]
        self.assertEqual("AdminChannelCredentialInput", credential_item["name"])
        self.assertEqual(["baseUrl"], credential_item["required"])
        self.assertIn("apiKey", credential_item["properties"])
        self.assertIn("secretRef", credential_item["properties"])
        self.assertIn("retryPolicy", add_channel["request_schema"]["schema"]["properties"])
        self.assertIn("timeoutMs", add_channel["request_schema"]["schema"]["properties"])
        retry_policy = add_channel["request_schema"]["schema"]["properties"]["retryPolicy"]
        self.assertEqual("ProviderRetryPolicy", retry_policy["name"])
        self.assertEqual(
            ["maxAttempts", "retryableStatusCodes"],
            retry_policy["required"],
        )
        self.assertFalse(retry_policy["additionalProperties"])
        self.assertEqual("AdminChannelMutationResponse", add_channel["response_schema"]["name"])
        self.assertEqual(["item"], add_channel["response_schema"]["schema"]["required"])
        channel_item = add_channel["response_schema"]["schema"]["properties"]["item"]
        self.assertNotIn("models", channel_item["required"])
        self.assertNotIn("models", channel_item["properties"])

        self.assertEqual("AdminChannelUpdateRequest", update_channel["request_schema"]["name"])
        self.assertEqual(["id"], update_channel["request_schema"]["schema"]["required"])
        self.assertNotIn("models", update_channel["request_schema"]["schema"]["properties"])
        self.assertIn("retryPolicy", update_channel["request_schema"]["schema"]["properties"])
        self.assertTrue(update_channel["request_schema"]["schema"]["properties"]["retryPolicy"]["nullable"])
        self.assertIn("timeoutMs", update_channel["request_schema"]["schema"]["properties"])
        self.assertTrue(update_channel["request_schema"]["schema"]["properties"]["timeoutMs"]["nullable"])
        self.assertEqual("AdminChannelMutationResponse", update_channel["response_schema"]["name"])
        update_channel_item = update_channel["response_schema"]["schema"]["properties"]["item"]
        self.assertNotIn("models", update_channel_item["required"])
        self.assertNotIn("models", update_channel_item["properties"])

        self.assertIsNone(test_channel.get("request_schema"))
        self.assertEqual("AdminChannelTestResponse", test_channel["response_schema"]["name"])
        self.assertEqual(["channelId", "success", "status", "latency", "item"], test_channel["response_schema"]["schema"]["required"])
        test_channel_item = test_channel["response_schema"]["schema"]["properties"]["item"]
        self.assertNotIn("models", test_channel_item["required"])
        self.assertNotIn("models", test_channel_item["properties"])
        self.assertEqual("/backend/v3/api/integration/channels/{channelId}/verify", test_channel["api_path"])
        self.assertEqual("POST", test_channel["api_method"])

        self.assertIsNone(fetch_provider_secrets.get("request_schema"))
        self.assertEqual("/backend/v3/api/integration/provider_secrets", fetch_provider_secrets["api_path"])

        self.assertEqual("AdminProviderSecretCreateRequest", add_provider_secret["request_schema"]["name"])
        self.assertEqual(
            ["providerCode", "name", "secretRef"],
            add_provider_secret["request_schema"]["schema"]["required"],
        )
        self.assertEqual("AdminProviderSecretMutationResponse", add_provider_secret["response_schema"]["name"])
        self.assertEqual(["item"], add_provider_secret["response_schema"]["schema"]["required"])

        self.assertEqual("AdminProviderSecretUpdateRequest", update_provider_secret["request_schema"]["name"])
        self.assertEqual(["id"], update_provider_secret["request_schema"]["schema"]["required"])
        self.assertEqual("AdminProviderSecretMutationResponse", update_provider_secret["response_schema"]["name"])

        for operation_key, operation in operations.items():
            self.assertNotIn("ChannelEndpoint", operation_key)
            self.assertNotIn("channelEndpoint", operation_key)
            self.assertNotIn("channel_endpoints", operation_key)
            self.assertNotIn("ChannelEndpoint", str(operation.get("request_schema")))
            self.assertNotIn("ChannelEndpoint", str(operation.get("response_schema")))

    def test_admin_channel_frontend_and_backend_sdk_do_not_use_generic_payloads(self) -> None:
        service = (
            ROOT
            / "apps"
            / "sdkwork-clawrouter-pc"
            / "packages"
            / "sdkwork-clawrouter-pc-admin-channel"
            / "src"
            / "channelService.ts"
        ).read_text(encoding="utf-8")
        channel_api = (ROOT / "sdks" / "clawrouter-backend-sdk" / "clawrouter-backend-sdk-typescript" / "src" / "api" / "integration.ts").read_text(
            encoding="utf-8"
        )
        provider_secret_api = (
            ROOT / "sdks" / "clawrouter-backend-sdk" / "clawrouter-backend-sdk-typescript" / "src" / "api" / "integration.ts"
        ).read_text(encoding="utf-8")
        type_exports = (
            ROOT / "sdks" / "clawrouter-backend-sdk" / "clawrouter-backend-sdk-typescript" / "src" / "types" / "index.ts"
        ).read_text(encoding="utf-8")

        for token in [
            "AdminChannelCreateRequest",
            "AdminChannelUpdateRequest",
            "ProviderRetryPolicy",
            "IntegrationProviderSecretsListParams",
            "AdminProviderSecretCreateRequest",
            "AdminProviderSecretUpdateRequest",
            "toCreateChannelRequest",
            "toUpdateChannelRequest",
            "export interface ChannelTestResult",
            "testChannel(id: string): Promise<ChannelTestResult>",
            "integration.channels.verify(",
            "toProviderSecretListRequest",
            "toCreateProviderSecretRequest",
            "toUpdateProviderSecretRequest",
        ]:
            self.assertIn(token, service)
        for removed_token in [
            "ChannelEndpointService",
            "AdminChannelEndpointCreateRequest",
            "AdminChannelEndpointUpdateRequest",
            "AdminChannelEndpointItem",
            "integration.channelEndpoints",
            "toCreateChannelEndpointRequest",
            "toUpdateChannelEndpointRequest",
            "normalizeChannelEndpoint",
            "fetchChannelEndpointOptions",
        ]:
            self.assertNotIn(removed_token, service)
        self.assertNotIn("models?:", (ROOT / "sdks" / "clawrouter-backend-sdk" / "clawrouter-backend-sdk-typescript" / "src" / "types" / "admin-channel-create-request.ts").read_text(encoding="utf-8"))
        self.assertNotIn("models?:", (ROOT / "sdks" / "clawrouter-backend-sdk" / "clawrouter-backend-sdk-typescript" / "src" / "types" / "admin-channel-update-request.ts").read_text(encoding="utf-8"))
        self.assertNotIn("models:", (ROOT / "sdks" / "clawrouter-backend-sdk" / "clawrouter-backend-sdk-typescript" / "src" / "types" / "admin-channel-item.ts").read_text(encoding="utf-8"))

        self.assertNotIn("as unknown as Record<string, unknown>", service)
        self.assertNotIn("filter as Record<string, unknown>", service)
        self.assertNotIn("{ id, ...updates } as Record<string, unknown>", service)

        self.assertIn("async list(): Promise<ChannelsListResult>", channel_api)
        self.assertIn("async create(body: AdminChannelCreateRequest): Promise<ChannelsCreateResult>", channel_api)
        self.assertIn("async update(body: AdminChannelUpdateRequest): Promise<ChannelsUpdateResult>", channel_api)
        self.assertIn("async verify(channelId: string): Promise<ChannelsVerifyResult>", channel_api)
        self.assertIn("retryPolicy?: ProviderRetryPolicy", (ROOT / "sdks" / "clawrouter-backend-sdk" / "clawrouter-backend-sdk-typescript" / "src" / "types" / "admin-channel-create-request.ts").read_text(encoding="utf-8"))
        self.assertIn("timeoutMs?: string", (ROOT / "sdks" / "clawrouter-backend-sdk" / "clawrouter-backend-sdk-typescript" / "src" / "types" / "admin-channel-create-request.ts").read_text(encoding="utf-8"))
        self.assertIn("retryPolicy?: ProviderRetryPolicy | JsonNull", (ROOT / "sdks" / "clawrouter-backend-sdk" / "clawrouter-backend-sdk-typescript" / "src" / "types" / "admin-channel-update-request.ts").read_text(encoding="utf-8"))
        self.assertIn("timeoutMs?: string | null", (ROOT / "sdks" / "clawrouter-backend-sdk" / "clawrouter-backend-sdk-typescript" / "src" / "types" / "admin-channel-update-request.ts").read_text(encoding="utf-8"))
        self.assertNotIn("async list(body?: OperationRequest): Promise<PlusApiResult>", channel_api)
        self.assertNotIn("async create(body?: OperationRequest): Promise<PlusApiResult>", channel_api)
        self.assertNotIn("async update(body?: OperationRequest): Promise<PlusApiResult>", channel_api)
        self.assertNotIn("TestChannelRequest", channel_api)
        self.assertNotIn("channelId: string | number", channel_api)

        self.assertIn("async list(params?: IntegrationProviderSecretsListParams): Promise<ProviderSecretsListResult>", provider_secret_api)
        self.assertIn("async create(body: AdminProviderSecretCreateRequest): Promise<ProviderSecretsCreateResult>", provider_secret_api)
        self.assertIn("async update(body: AdminProviderSecretUpdateRequest): Promise<ProviderSecretsUpdateResult>", provider_secret_api)
        self.assertNotIn("readonly channelEndpoints: IntegrationChannelEndpointsApi", provider_secret_api)
        self.assertNotIn("ChannelEndpointsListResult", provider_secret_api)
        self.assertNotIn("AdminChannelEndpointCreateRequest", provider_secret_api)
        self.assertNotIn("AdminChannelEndpointUpdateRequest", provider_secret_api)
        self.assertNotIn("async create(body?: OperationRequest): Promise<PlusApiResult>", provider_secret_api)
        self.assertNotIn("async update(body?: OperationRequest): Promise<PlusApiResult>", provider_secret_api)

        for token in [
            "AdminChannelCreateRequest",
            "AdminChannelUpdateRequest",
            "ProviderRetryPolicy",
            "AdminChannelMutationResponse",
            "AdminChannelTestResponse",
            "ChannelsCreateResult",
            "ChannelsVerifyResult",
            "ChannelsUpdateResult",
            "AdminProviderSecretCreateRequest",
            "AdminProviderSecretUpdateRequest",
            "AdminProviderSecretMutationResponse",
            "ProviderSecretsCreateResult",
            "ProviderSecretsListResult",
            "ProviderSecretsUpdateResult",
        ]:
            self.assertIn(f"export type {{ {token} }}", type_exports)

        for removed_token in [
            "AdminChannelListRequest",
            "TestChannelRequest",
            "AdminChannelEndpointCreateRequest",
            "AdminChannelEndpointUpdateRequest",
            "AdminChannelEndpointItem",
            "AdminChannelEndpointMutationResponse",
            "AdminChannelEndpointsResponse",
            "ChannelEndpointsCreateResult",
            "ChannelEndpointsListResult",
            "ChannelEndpointsUpdateResult",
        ]:
            self.assertNotIn(f"export type {{ {removed_token} }}", type_exports)

    def test_admin_channel_forms_use_dedicated_command_inputs(self) -> None:
        package_root = (
            ROOT
            / "apps"
            / "sdkwork-clawrouter-pc"
            / "packages"
            / "sdkwork-clawrouter-pc-admin-channel"
        )
        package = json.loads((package_root / "package.json").read_text(encoding="utf-8"))
        service = (package_root / "src" / "channelService.ts").read_text(encoding="utf-8")
        view = (package_root / "src" / "index.tsx").read_text(encoding="utf-8")
        form = (package_root / "src" / "channelForm.ts").read_text(encoding="utf-8")
        verifier = (ROOT / "scripts" / "verify-claw-router-application.mjs").read_text(encoding="utf-8")

        self.assertEqual(package["type"], "module")
        self.assertEqual(package["scripts"]["typecheck"], "tsc --noEmit")
        self.assertIn("export type ChannelCreateInput", service)
        self.assertIn("export type ChannelUpdateInput", service)
        self.assertIn("channelId: string", service)
        self.assertIn("channelId: readPositiveIdText(item, 'channelId'", service)
        self.assertIn("static async addChannel(channel: ChannelCreateInput): Promise<ChannelItem>", service)
        self.assertIn("static async updateChannel(id: string, updates: ChannelUpdateInput): Promise<ChannelItem>", service)
        self.assertIn("readRequiredApiItem(result, 'Updated channel response is missing data')", service)
        self.assertIn("function toCreateChannelRequest(channel: ChannelCreateInput)", service)
        self.assertIn("function toUpdateChannelRequest(id: string, updates: ChannelUpdateInput)", service)
        self.assertNotIn("addChannel(channel: ChannelItem)", service)
        self.assertNotIn("Partial<\n  Omit<ChannelItem", service)
        self.assertNotIn("Partial<ChannelItem>", view)
        self.assertIn("createChannelInputFromForm", view)
        self.assertIn("createChannelCopyDraft", view)
        self.assertIn("createChannelEditDraft", view)
        self.assertIn("createChannelUpdateInputFromForm", view)
        self.assertIn("createChannelStatusUpdateInput", view)
        self.assertIn("ChannelService.addChannel(createChannelInputFromForm(channel))", view)
        self.assertIn("ChannelService.updateChannel(editingChannel.id, createChannelUpdateInputFromForm(channel))", view)
        self.assertIn("createChannelStatusUpdateInput(channel.status === 'active' ? 'disabled' : 'active')", view)
        self.assertIn("export function createChannelInputFromForm", form)
        self.assertIn("export function createChannelCopyDraft", form)
        self.assertIn("export function createChannelEditDraft", form)
        self.assertIn("export function createChannelUpdateInputFromForm", form)
        self.assertIn("export function createChannelStatusUpdateInput", form)
        self.assertIn("type AccountDrawerMode = 'create' | 'copy' | 'edit'", view)
        self.assertIn("const openCopyCreateModal = (channel: ChannelItem)", view)
        self.assertIn("setChannelFormDraft(createChannelCopyDraft(channel))", view)
        self.assertIn("admin.channel.actions.copyCreateChannel", view)
        self.assertIn("admin.channel.modals.copyChannelTitle", view)
        self.assertNotIn("Date.now()", view)
        self.assertNotIn("Math.random()", view)
        self.assertNotIn("Date.now()", form)
        self.assertNotIn("Math.random()", form)
        self.assertIn("admin-channel-runtime.test.ts", verifier)

    def test_admin_provider_account_endpoint_page_is_removed(self) -> None:
        source_dir = (
            ROOT
            / "apps"
            / "sdkwork-clawrouter-pc"
            / "packages"
            / "sdkwork-clawrouter-pc-admin-channel"
            / "src"
        )
        view = (source_dir / "index.tsx").read_text(encoding="utf-8")
        service = (source_dir / "channelService.ts").read_text(encoding="utf-8")
        form = (source_dir / "channelForm.ts").read_text(encoding="utf-8")
        app = (ROOT / "apps" / "sdkwork-clawrouter-pc" / "src" / "App.tsx").read_text(encoding="utf-8")
        registry = (ROOT / "apps" / "sdkwork-clawrouter-pc" / "src" / "adminModuleRegistry.ts").read_text(encoding="utf-8")

        for source_text in [view, service, form, app, registry]:
            self.assertNotIn("ChannelEndpoint", source_text)
            self.assertNotIn("channelEndpoints", source_text)
            self.assertNotIn("channel_endpoints", source_text)
        self.assertIn("ChannelService.fetchChannels()", view)
        self.assertNotIn('path="channel/endpoints"', app)
        self.assertNotIn("/admin/channel/endpoints", registry)
        self.assertNotIn("admin.menu.channelEndpoints", registry)

    def test_admin_provider_account_endpoint_models_are_removed_from_route_contract(self) -> None:
        contract = (
            ROOT / "docs" / "schema-registry" / "frontend-field-contracts.yaml"
        ).read_text(encoding="utf-8")
        self.assertNotIn("ChannelEndpoint", contract)
        self.assertNotIn("/admin/channel/endpoints", contract)
        self.assertNotIn("channel_endpoints", contract)
        self.assertNotIn("- models\n  - capabilities\n  - resourceCodes", contract)
        self.assertNotIn("- item.models\n  - item.capabilities\n  - item.resourceCodes", contract)

    def test_admin_provider_secret_forms_use_dedicated_command_inputs(self) -> None:
        package_root = (
            ROOT
            / "apps"
            / "sdkwork-clawrouter-pc"
            / "packages"
            / "sdkwork-clawrouter-pc-admin-channel"
        )
        service = (package_root / "src" / "channelService.ts").read_text(encoding="utf-8")
        view = (package_root / "src" / "index.tsx").read_text(encoding="utf-8")
        form = (package_root / "src" / "channelForm.ts").read_text(encoding="utf-8")
        runtime_test = (
            ROOT / "apps" / "sdkwork-clawrouter-pc" / "admin-channel-runtime.test.ts"
        ).read_text(encoding="utf-8")

        self.assertIn("export type ProviderSecretUpdateInput", service)
        self.assertIn("secret: ProviderSecretInput", service)
        self.assertIn(
            "updates: ProviderSecretUpdateInput",
            service,
        )
        self.assertIn("): Promise<ProviderSecretItem> {", service)
        self.assertIn("readRequiredApiItem(result, 'Updated provider credential response is missing data')", service)
        self.assertIn("function toUpdateProviderSecretRequest(", service)
        self.assertIn("updates: ProviderSecretUpdateInput", service)
        self.assertNotIn("updates: Partial<ProviderSecretInput>", service)

        self.assertIn("export type ProviderSecretFormValues", form)
        for token in [
            "export function createProviderSecretInputFromForm",
            "export function createProviderSecretUpdateInputFromForm",
            "export function createProviderSecretStatusUpdateInput",
        ]:
            self.assertIn(token, form)
            self.assertIn(token.replace("export function ", ""), runtime_test)

        self.assertIn("ProviderSecretService.fetchProviderSecrets()", view)
        self.assertIn("function CredentialDetailsModal", view)
        self.assertIn("findProviderSecretForCredential", view)
        self.assertNotIn("function ProviderSecretModal", view)
        self.assertNotIn("secretModalMode", view)
        self.assertNotIn("ProviderSecretService.addProviderSecret(createProviderSecretInputFromForm(secret))", view)
        self.assertNotIn(
            "ProviderSecretService.updateProviderSecret(editingSecret.id, createProviderSecretUpdateInputFromForm(secret))",
            view,
        )
        self.assertNotIn(
            "ProviderSecretService.updateProviderSecret(secret.id, createProviderSecretStatusUpdateInput(nextStatus))",
            view,
        )

    def test_admin_channel_model_picker_uses_runtime_model_ids(self) -> None:
        source_dir = (
            ROOT
            / "apps"
            / "sdkwork-clawrouter-pc"
            / "packages"
            / "sdkwork-clawrouter-pc-admin-channel"
            / "src"
        )
        service = (source_dir / "channelService.ts").read_text(encoding="utf-8")
        runtime_test = (
            ROOT / "apps" / "sdkwork-clawrouter-pc" / "admin-channel-runtime.test.ts"
        ).read_text(encoding="utf-8")

        normalizer = service.split("function normalizeModelCatalogItem", 1)[1]

        self.assertIn("ChannelModelCatalogService", service)
        self.assertIn("channelBackendClient().ai.models.list()", service)
        self.assertIn("readRequiredString(item, 'model', 'Model catalog runtime model id is required')", normalizer)
        self.assertNotIn("readRequiredString(item, 'name', 'Model catalog name is required')", normalizer)
        self.assertIn("displayName: readOptionalString(item, 'displayName') ?? readOptionalString(item, 'name') ?? model", normalizer)
        self.assertIn("admin channel mapping catalog maps runtime ids instead of display aliases", runtime_test)
        self.assertIn('displayName: "GPT-4o Mini"', runtime_test)
        self.assertIn('catalogKey: "openai/gpt-4o-mini"', runtime_test)
        self.assertIn("admin channel mapping catalog rejects regional catalog key debt", runtime_test)
        self.assertIn("admin channel mapping catalog rejects cloud region segments but accepts relay provider namespaces", runtime_test)
        self.assertIn("isRegionalModelCatalogKey", service)
        self.assertIn("parseModelCatalogIdentity", service)
        self.assertNotIn("function isKnownRegionSegment", service)
        self.assertIn("openrouter/anthropic/claude-3-opus", runtime_test)
        self.assertIn("Model catalog key must use vendor/model identity", service)
        self.assertIn("catalogKey: \"openai/global/gpt-4o-mini\"", runtime_test)
        self.assertNotIn('catalogKey: "openai/global/GPT-4o Mini"', runtime_test)

    def test_admin_channel_test_ui_is_sdk_backed_and_persists_probe_result(self) -> None:
        source_dir = (
            ROOT
            / "apps"
            / "sdkwork-clawrouter-pc"
            / "packages"
            / "sdkwork-clawrouter-pc-admin-channel"
            / "src"
        )
        service = (source_dir / "channelService.ts").read_text(encoding="utf-8")
        ui = (source_dir / "index.tsx").read_text(encoding="utf-8")
        contract = (
            ROOT / "docs" / "schema-registry" / "frontend-field-contracts.yaml"
        ).read_text(encoding="utf-8")

        self.assertIn("static async testChannel(id: string): Promise<ChannelTestResult>", service)
        self.assertIn("channelBackendClient().integration.channels.verify(", service)
        self.assertNotIn("createIdempotencyParams('admin-channel-test')", service)
        self.assertNotIn("requestParams('admin-channel-test')", service)
        self.assertIn("readRequiredApiItem(result, 'Channel test response is missing channel data', ['item'])", service)
        self.assertNotIn("emptyTestChannelRequest", service)
        self.assertNotIn("TestChannelRequest", service)
        self.assertIn("secretRef: readOptionalString(item, 'secretRef')", service.split("function normalizeChannel", 1)[1])

        self.assertIn("const handleTestChannel = async (id: string)", ui)
        self.assertIn("await ChannelService.testChannel(id)", ui)
        self.assertIn("result.item", ui)
        self.assertIn("title={t('admin.channel.actions.testChannel')}", ui)
        self.assertIn("<Network className=\"w-4 h-4\" />", ui)

        self.assertIn("operation: testChannel", contract)
        self.assertIn("api_path: /backend/v3/api/integration/channels/{channelId}/verify", contract)
        self.assertIn("name: AdminChannelTestResponse", contract)

    def test_admin_channel_destructive_actions_use_shared_confirm_dialog(self) -> None:
        commons_dir = (
            ROOT
            / "apps"
            / "sdkwork-clawrouter-pc"
            / "packages"
            / "sdkwork-clawroutes-pc-commons"
            / "src"
        )
        ui = (
            ROOT
            / "apps"
            / "sdkwork-clawrouter-pc"
            / "packages"
            / "sdkwork-clawrouter-pc-admin-channel"
            / "src"
            / "index.tsx"
        ).read_text(encoding="utf-8")
        confirm_dialog = (commons_dir / "components" / "ConfirmDialog.tsx")
        commons_index = (commons_dir / "index.ts").read_text(encoding="utf-8")

        self.assertTrue(confirm_dialog.exists())
        confirm_source = confirm_dialog.read_text(encoding="utf-8")
        self.assertIn("export function ConfirmDialog", confirm_source)
        self.assertIn("role=\"alertdialog\"", confirm_source)
        self.assertIn("aria-modal=\"true\"", confirm_source)
        self.assertIn("disabled={isBusy}", confirm_source)
        self.assertIn("aria-busy={isBusy}", confirm_source)
        self.assertIn("ConfirmDialog", commons_index)

        self.assertIn("ConfirmDialog", ui)
        self.assertIn("deleteConfirmation", ui)
        self.assertIn("openDeleteChannelConfirmation", ui)
        self.assertIn("executeConfirmedDelete", ui)
        self.assertIn("onConfirm={() => void executeConfirmedDelete()}", ui)
        self.assertIn("onCancel={closeDeleteConfirmation}", ui)
        self.assertIn("isBusy={Boolean(confirmDeleteBusy)}", ui)
        self.assertNotIn("window.confirm", ui)
        self.assertNotIn("confirm('Delete this", ui)

    def test_admin_channel_read_model_does_not_fallback_when_capabilities_column_is_invalid(self) -> None:
        store_paths = [
            "services/sdkwork-clawrouter-router-service/src/infrastructure/sql/sqlite/admin_channel_store.rs",
            "services/sdkwork-clawrouter-router-service/src/infrastructure/sql/postgres/admin_channel_store.rs",
        ]

        for relative_path in store_paths:
            store = (ROOT / relative_path).read_text(encoding="utf-8")
            compact_store = " ".join(store.split())
            with self.subTest(store=relative_path):
                self.assertIn('row.try_get::<String, _>("capabilities_json")', compact_store)
                self.assertIn(".map_err(row_error)?", compact_store)
                self.assertIn(".as_str()", compact_store)
                self.assertNotIn('unwrap_or_else(|_| "[\\"llm\\"]".to_owned())', store)
                self.assertIn("invalid channel capabilities json from database row", store)

    def test_admin_channel_read_model_fails_closed_for_channel_status_and_health_status(self) -> None:
        store_paths = [
            "services/sdkwork-clawrouter-router-service/src/infrastructure/sql/sqlite/admin_channel_store.rs",
            "services/sdkwork-clawrouter-router-service/src/infrastructure/sql/postgres/admin_channel_store.rs",
        ]

        for relative_path in store_paths:
            store = (ROOT / relative_path).read_text(encoding="utf-8")
            compact_store = " ".join(store.split())
            with self.subTest(store=relative_path):
                self.assertIn(
                    'let status = required_integer_cell(&row, "status", "status")?;',
                    compact_store,
                )
                self.assertIn(
                    'let health_status = required_integer_cell(&row, "health_status", "health_status")?;',
                    compact_store,
                )
                self.assertIn(
                    'let snapshot_health_status = optional_valid_health_status_cell(&row, "snapshot_health_status")?;',
                    compact_store,
                )
                for token in [
                    "fn status_label(",
                    "status: i64,",
                    "health_status: i64,",
                    "snapshot_health_status: Option<i64>,",
                    "errors: i64,",
                    ") -> DomainResult<String>",
                ]:
                    self.assertIn(token, compact_store)
                self.assertIn("missing admin channel status from database row", store)
                self.assertIn("missing admin channel health_status from database row", store)
                self.assertIn("invalid admin channel status from database row", store)
                self.assertIn("invalid admin channel health_status from database row", store)
                self.assertNotIn('status_label( optional_integer_cell(&row, "status")', compact_store)
                self.assertNotIn('optional_integer_cell(&row, "health_status") .or_else', compact_store)

    def test_admin_channel_read_model_fails_closed_for_protocol_and_access_type(self) -> None:
        store_paths = [
            "services/sdkwork-clawrouter-router-service/src/infrastructure/sql/sqlite/admin_channel_store.rs",
            "services/sdkwork-clawrouter-router-service/src/infrastructure/sql/postgres/admin_channel_store.rs",
        ]

        for relative_path in store_paths:
            store = (ROOT / relative_path).read_text(encoding="utf-8")
            compact_store = " ".join(store.split())
            with self.subTest(store=relative_path):
                self.assertIn(
                    'protocol: protocol_label(required_integer_cell(&row, "protocol", "protocol")?)?',
                    compact_store,
                )
                self.assertIn(
                    'access_type: access_type_label(required_integer_cell(&row, "access_type", "access_type")?)?',
                    compact_store,
                )
                self.assertIn(
                    "fn protocol_label(value: i64) -> DomainResult<String>",
                    compact_store,
                )
                self.assertIn(
                    "fn access_type_label(value: i64) -> DomainResult<String>",
                    compact_store,
                )
                self.assertIn("missing admin channel protocol from database row", store)
                self.assertIn("missing admin channel access_type from database row", store)
                self.assertIn("invalid admin channel protocol from database row", store)
                self.assertIn("invalid admin channel access_type from database row", store)
                self.assertNotIn('protocol_label(optional_integer_cell(&row, "protocol"))', store)
                self.assertNotIn('access_type_label(optional_integer_cell(&row, "access_type"))', store)

    def test_admin_provider_secret_read_model_fails_closed_for_auth_type_and_status(self) -> None:
        store_paths = [
            "services/sdkwork-clawrouter-router-service/src/infrastructure/sql/sqlite/admin_provider_secret_store.rs",
            "services/sdkwork-clawrouter-router-service/src/infrastructure/sql/postgres/admin_provider_secret_store.rs",
        ]

        for relative_path in store_paths:
            store = (ROOT / relative_path).read_text(encoding="utf-8")
            compact_store = " ".join(store.split())
            with self.subTest(store=relative_path):
                self.assertIn(
                    'auth_type: auth_type_label(required_integer_cell(&row, "auth_type", "auth_type")?)?',
                    compact_store,
                )
                self.assertIn(
                    'status: status_label(required_integer_cell(&row, "status", "status")?)?',
                    compact_store,
                )
                self.assertIn(
                    "fn auth_type_label(value: i64) -> DomainResult<String>",
                    compact_store,
                )
                self.assertIn(
                    "fn status_label(value: i64) -> DomainResult<String>",
                    compact_store,
                )
                self.assertIn("missing admin provider secret auth_type from database row", store)
                self.assertIn("missing admin provider secret status from database row", store)
                self.assertIn("invalid admin provider secret auth_type from database row", store)
                self.assertIn("invalid admin provider secret status from database row", store)
                self.assertNotIn('auth_type_label(optional_integer_cell(&row, "auth_type"))', store)
                self.assertNotIn('status_label(optional_integer_cell(&row, "status"))', store)


if __name__ == "__main__":
    unittest.main()
