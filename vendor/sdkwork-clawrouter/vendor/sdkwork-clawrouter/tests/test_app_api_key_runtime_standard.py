import os
import unittest
from pathlib import Path

from tools.frontend_contract_loader import load_frontend_field_contract
from tools.schema_registry_loader import render_schema_registry


ROOT = Path(__file__).resolve().parents[1]


class AppApiKeyRuntimeStandardTest(unittest.TestCase):
    def test_app_api_key_creation_does_not_use_in_memory_command_store(self) -> None:
        api_key_route = ROOT / "services" / "sdkwork-clawrouter-router-service" / "src" / "api" / "app_api_keys.rs"
        source = api_key_route.read_text(encoding="utf-8")

        self.assertNotIn("InMemoryGatewayApiKeyCommandStore", source)
        self.assertNotIn("app_api_key_router_with_optional_api_key_hasher", source)
        self.assertNotIn("app_api_key_router_with_api_key_hasher", source)

    def test_app_api_service_exposes_creation_only_with_command_store_and_hasher(self) -> None:
        service = ROOT / "crates" / "sdkwork-routes-clawrouter-app-api" / "src" / "routes.rs"
        source = service.read_text(encoding="utf-8")

        self.assertNotIn("router_with_product_catalog_and_api_key_security_config", source)
        self.assertNotIn("router_with_product_catalog_api_key_hasher_and_database_status", source)
        self.assertIn("app_routing_channel_command_store", source)
        self.assertIn("SqliteAppRoutingChannelCommandStore::new", source)
        self.assertIn("PostgresAppRoutingChannelCommandStore::new", source)

    def test_app_api_key_creation_uses_refreshable_read_store_not_overlay(self) -> None:
        api_key_route = ROOT / "services" / "sdkwork-clawrouter-router-service" / "src" / "api" / "app_api_keys.rs"
        source = api_key_route.read_text(encoding="utf-8")

        self.assertNotIn("AppApiKeyOverlay", source)
        self.assertNotIn("Mutex<", source)
        self.assertNotIn("overlay", source)
        self.assertIn("GatewayApiKeyManagementReadStore", source)
        self.assertIn("app_api_key_router_with_read_store_and_command_store", source)

    def test_database_api_key_routes_reload_sql_read_model(self) -> None:
        service = ROOT / "crates" / "sdkwork-routes-clawrouter-app-api" / "src" / "routes.rs"
        source = service.read_text(encoding="utf-8")

        self.assertIn("api_key_secret_codec_from_config(&api_key_security_config)", source)
        self.assertIn("SqlitePricingCatalogLoader::with_api_key_secret_codec", source)
        self.assertIn("PostgresPricingCatalogLoader::with_api_key_secret_codec", source)
        self.assertIn("SqliteAppRoutingReadStore::with_api_key_secret_codec", source)
        self.assertIn("PostgresAppRoutingReadStore::with_api_key_secret_codec", source)
        self.assertIn("SqliteAppRoutingChannelCommandStore::with_provider_health_probe", source)
        self.assertIn("PostgresAppRoutingChannelCommandStore::with_provider_health_probe", source)
        self.assertIn("api_key_secret_codec.clone()", source)
        self.assertNotIn("router_with_product_catalog_api_key_command_store_and_database_status", source)

    def test_sql_api_key_command_store_persists_application_created_at(self) -> None:
        store_paths = [
            ROOT
            / "services"
            / "sdkwork-clawrouter-router-service"
            / "src"
            / "infrastructure"
            / "sql"
            / "sqlite"
            / "api_key_command_store.rs",
            ROOT
            / "services"
            / "sdkwork-clawrouter-router-service"
            / "src"
            / "infrastructure"
            / "sql"
            / "postgres"
            / "api_key_command_store.rs",
        ]

        for path in store_paths:
            source = path.read_text(encoding="utf-8")
            with self.subTest(path=path):
                self.assertIn("created_at, updated_at", source)
                self.assertIn(".bind(&command.created_at)", source)

    def test_app_api_key_creation_has_contract_level_idempotency(self) -> None:
        contract = (
            ROOT / "docs" / "schema-registry" / "frontend-field-contracts.yaml"
        ).read_text(encoding="utf-8")
        contract_payload = load_frontend_field_contract(
            ROOT,
            ROOT / "docs" / "schema-registry" / "frontend-field-contracts.yaml",
        )
        openapi = (
            ROOT / "generated" / "openapi" / "clawrouter-app-openapi.json"
        ).read_text(encoding="utf-8")
        sdk = (
            ROOT / "sdks" / "clawrouter-app-sdk" / "clawrouter-app-sdk-typescript" / "src" / "api" / "iam.ts"
        ).read_text(encoding="utf-8")
        frontend = (
            ROOT
            / "apps"
            / "sdkwork-clawrouter-pc"
            / "packages"
            / "sdkwork-clawrouter-pc-console-api-keys"
            / "src"
            / "apiKeyService.ts"
        ).read_text(encoding="utf-8")

        self.assertIn("idempotency_required: true", contract)
        self.assertIn('"name": "Idempotency-Key"', openapi)
        self.assertIn('"required": true', openapi)
        self.assertNotIn('"name": "X-Request-Id"', openapi)
        self.assertIn("CreateApiKeyRequest", sdk)
        self.assertIn("ApiKeysCreateResult", sdk)
        self.assertIn("create(body: CreateApiKeyRequest, params: IamApiKeysCreateParams)", sdk)
        self.assertIn("post<ApiKeysCreateResult>", sdk)
        self.assertNotIn("xRequestId", sdk)
        self.assertIn("createClientOperationToken", frontend)
        self.assertIn("from 'sdkwork-clawroutes-pc-commons/idempotency'", frontend)
        self.assertIn("from 'sdkwork-clawroutes-pc-commons/sdk-clients'", frontend)
        self.assertIn("from 'sdkwork-clawroutes-pc-commons/api-result'", frontend)
        self.assertNotIn("function createClientOperationToken", frontend)
        self.assertIn("const idempotencyKey = createClientOperationToken('create-api-key');", frontend)
        self.assertNotIn("createClientOperationToken('request')", frontend)
        self.assertIn("{ idempotencyKey }", frontend)
        self.assertNotIn("xRequestId", frontend)
        self.assertNotIn("x-sdkwork-tenant-id", frontend.lower())
        self.assertNotIn("x-sdkwork-organization-id", frontend.lower())
        self.assertNotIn("x-sdkwork-user-id", frontend.lower())

    def test_app_api_key_frontend_consumes_precise_create_key_sdk_types(self) -> None:
        frontend = (
            ROOT
            / "apps"
            / "sdkwork-clawrouter-pc"
            / "packages"
            / "sdkwork-clawrouter-pc-console-api-keys"
            / "src"
            / "apiKeyService.ts"
        ).read_text(encoding="utf-8")
        create_key_body = frontend.split("static async createKey", 1)[1]

        self.assertIn("CreateApiKeyRequest", frontend)
        self.assertIn("from '@sdkwork/clawrouter-app-sdk'", frontend)
        self.assertIn("type ApiKeyModality = NonNullable<CreateApiKeyRequest['modalities']>[number]", frontend)
        self.assertIn("toApiKeyModalities(input.modalities)", frontend)
        self.assertIn("const data = readApiRecord(result)", create_key_body)
        self.assertIn(
            "readRequiredApiItem(result, 'API key creation response is missing key data', ['item'])",
            create_key_body,
        )
        self.assertNotIn("normalizeApiKey(data.item)", create_key_body)
        self.assertNotIn("const data = result.data", create_key_body)
        self.assertNotIn("const data = isRecord(result.data) ? result.data : {}", create_key_body)

    def test_app_api_key_fetch_uses_standard_success_and_list_read_helpers(self) -> None:
        frontend = (
            ROOT
            / "apps"
            / "sdkwork-clawrouter-pc"
            / "packages"
            / "sdkwork-clawrouter-pc-console-api-keys"
            / "src"
            / "apiKeyService.ts"
        ).read_text(encoding="utf-8")
        fetch_body = frontend.split("static async fetchKeys", 1)[1].split("static async createKey", 1)[0]

        self.assertIn("ensureSdkworkApiSuccess(result, 'console.apiKeys.errors.loadFallback')", fetch_body)
        self.assertIn("readRequiredApiItems(result, 'console.apiKeys.errors.loadFallback')", fetch_body)
        self.assertIn("getClawRouterAppSdkClient().ai.channelGroups.list()", fetch_body)
        self.assertIn("readRequiredApiItems(result, 'console.apiKeys.errors.loadGroupsFallback')", fetch_body)
        self.assertNotIn(".http.request<", fetch_body)
        self.assertNotIn("requestApp<", fetch_body)
        self.assertNotIn("APP_API_PREFIX", fetch_body)
        self.assertNotIn("Array.isArray(data.items)", fetch_body)
        self.assertNotIn("Array.isArray(data.groups)", fetch_body)

    def test_console_api_key_product_states_are_localized(self) -> None:
        view = (
            ROOT
            / "apps"
            / "sdkwork-clawrouter-pc"
            / "packages"
            / "sdkwork-clawrouter-pc-console-api-keys"
            / "src"
            / "ApiKeysView.tsx"
        ).read_text(encoding="utf-8")
        drawer = (
            ROOT
            / "apps"
            / "sdkwork-clawrouter-pc"
            / "packages"
            / "sdkwork-clawrouter-pc-console-api-keys"
            / "src"
            / "CreateKeyDrawer.tsx"
        ).read_text(encoding="utf-8")
        usage_drawer = (
            ROOT
            / "apps"
            / "sdkwork-clawrouter-pc"
            / "packages"
            / "sdkwork-clawrouter-pc-console-api-keys"
            / "src"
            / "usage-details"
            / "ApiKeyUsageDetailsDrawer.tsx"
        ).read_text(encoding="utf-8")
        service = (
            ROOT
            / "apps"
            / "sdkwork-clawrouter-pc"
            / "packages"
            / "sdkwork-clawrouter-pc-console-api-keys"
            / "src"
            / "apiKeyService.ts"
        ).read_text(encoding="utf-8")
        i18n_resources_dir = (
            ROOT
            / "apps"
            / "sdkwork-clawrouter-pc"
            / "packages"
            / "sdkwork-clawrouter-pc-i18n"
            / "src"
            / "resources"
        )
        i18n = "".join(
            path.read_text(encoding="utf-8")
            for path in sorted(i18n_resources_dir.rglob("*.ts"))
        )
        combined = view + drawer + usage_drawer + service

        for marker in [
            "console.apiKeys.title",
            "console.apiKeys.searchPlaceholder",
            "console.apiKeys.loading",
            "console.apiKeys.empty",
            "console.apiKeys.created",
            "console.apiKeys.copyKey",
            "console.apiKeys.usageDetails",
            "console.apiKeys.usageDetailsTitle",
            "console.apiKeys.detailsTitle",
            "console.apiKeys.editTitle",
            "console.apiKeys.createTitle",
            "console.apiKeys.deleteTitle",
            "console.apiKeys.status.enabled",
            "console.apiKeys.status.disabled",
            "console.apiKeys.errors.loadFallback",
            "console.apiKeys.errors.createFallback",
            "console.apiKeys.errors.updateFallback",
            "console.apiKeys.errors.groupUpdateFallback",
            "console.apiKeys.errors.deleteFallback",
        ]:
            self.assertIn(marker, combined + i18n)
            self.assertGreaterEqual(i18n.count(f'"{marker}"'), 2)

        self.assertIn("displayApiKeyStatus(key.status, t)", view)
        self.assertNotIn("{key.status}", view)

        for hardcoded_copy in [
            "Failed to load API keys",
            "Failed to create API key",
            "Failed to update API key",
            "Failed to update channel group",
            "Failed to delete API key",
            "Loading API keys",
            "No API keys found",
            "Search keys or groups",
            "Copy key",
            "Usage details",
            "API Key Details",
            "Edit API Key",
            "Create API Key",
            "Delete API key?",
        ]:
            self.assertNotIn(hardcoded_copy, combined)

    def test_app_api_key_fetch_uses_precise_sdk_response_contract(self) -> None:
        contract = (
            ROOT / "docs" / "schema-registry" / "frontend-field-contracts.yaml"
        ).read_text(encoding="utf-8")
        openapi = (
            ROOT / "generated" / "openapi" / "clawrouter-app-openapi.json"
        ).read_text(encoding="utf-8")
        sdk_iam = (
            ROOT / "sdks" / "clawrouter-app-sdk" / "clawrouter-app-sdk-typescript" / "src" / "api" / "iam.ts"
        ).read_text(encoding="utf-8")
        sdk_ai = (
            ROOT / "sdks" / "clawrouter-app-sdk" / "clawrouter-app-sdk-typescript" / "src" / "api" / "ai.ts"
        ).read_text(encoding="utf-8")
        frontend = (
            ROOT
            / "apps"
            / "sdkwork-clawrouter-pc"
            / "packages"
            / "sdkwork-clawrouter-pc-console-api-keys"
            / "src"
            / "apiKeyService.ts"
        ).read_text(encoding="utf-8")
        legacy_group_snake_plural = "api_" + "key_" + "groups"
        legacy_group_camel_plural = "api" + "Key" + "Groups"
        legacy_iam_group_path = "/app/v3/api/iam/" + legacy_group_snake_plural

        self.assertIn("name: AppApiKeyListResponse", contract)
        self.assertIn('"AppApiKeyListResponse"', openapi)
        self.assertIn('"ApiKeysListResult"', openapi)
        self.assertIn('"$ref": "#/components/schemas/AppApiKeyListResponse"', openapi)
        self.assertIn("async list(): Promise<ApiKeysListResult>", sdk_iam)
        self.assertIn("appApiPath(`/iam/api_keys`)", sdk_iam)
        self.assertIn("get<ApiKeysListResult>", sdk_iam)
        self.assertIn("async list(): Promise<ChannelGroupsListResult>", sdk_ai)
        self.assertIn("appApiPath(`/ai/channel_groups`)", sdk_ai)
        self.assertNotIn(legacy_group_snake_plural, sdk_ai)
        self.assertNotIn(legacy_group_camel_plural, sdk_iam)
        self.assertNotIn(legacy_iam_group_path, contract)
        self.assertIn("/app/v3/api/ai/channel_groups", contract)

        response_path = ROOT / "sdks" / "clawrouter-app-sdk" / "clawrouter-app-sdk-typescript" / "src" / "types" / "app-api-key-list-response.ts"
        result_path = ROOT / "sdks" / "clawrouter-app-sdk" / "clawrouter-app-sdk-typescript" / "src" / "types" / "api-keys-list-result.ts"
        group_path = ROOT / "sdks" / "clawrouter-app-sdk" / "clawrouter-app-sdk-typescript" / "src" / "types" / "app-channel-group.ts"
        old_group_path = ROOT / "sdks" / "clawrouter-app-sdk" / "clawrouter-app-sdk-typescript" / "src" / "types" / ("app-" + "api-" + "key-" + "group.ts")
        self.assertTrue(response_path.exists())
        self.assertTrue(result_path.exists())
        self.assertTrue(group_path.exists())
        self.assertFalse(old_group_path.exists())
        self.assertIn("items: AppApiKeyItem[];", response_path.read_text(encoding="utf-8"))
        self.assertIn("groups: AppChannelGroup[];", response_path.read_text(encoding="utf-8"))
        self.assertIn("data?: AppApiKeyListResponse;", result_path.read_text(encoding="utf-8"))

        self.assertIn("AppApiKeyListResponse as SdkAppApiKeyListResponse", frontend)
        self.assertIn("id: SdkAppApiKeyListResponse['items'][number]['id'];", frontend)
        self.assertNotIn("Api" + "Key" + "Group", frontend)
        self.assertNotIn("api" + "Key" + "Group", frontend)

    def test_console_api_key_frontend_uses_pure_create_command_form_adapter(self) -> None:
        package = (
            ROOT
            / "apps"
            / "sdkwork-clawrouter-pc"
            / "packages"
            / "sdkwork-clawrouter-pc-console-api-keys"
            / "package.json"
        ).read_text(encoding="utf-8")
        form_path = (
            ROOT
            / "apps"
            / "sdkwork-clawrouter-pc"
            / "packages"
            / "sdkwork-clawrouter-pc-console-api-keys"
            / "src"
            / "apiKeyForm.ts"
        )
        view = (
            ROOT
            / "apps"
            / "sdkwork-clawrouter-pc"
            / "packages"
            / "sdkwork-clawrouter-pc-console-api-keys"
            / "src"
            / "ApiKeysView.tsx"
        ).read_text(encoding="utf-8")
        drawer = (
            ROOT
            / "apps"
            / "sdkwork-clawrouter-pc"
            / "packages"
            / "sdkwork-clawrouter-pc-console-api-keys"
            / "src"
            / "CreateKeyDrawer.tsx"
        ).read_text(encoding="utf-8")
        verifier = (ROOT / "scripts" / "verify-claw-router-application.mjs").read_text(encoding="utf-8")
        product_tests = (ROOT / "scripts" / "run-claw-router-application.test.mjs").read_text(encoding="utf-8")

        self.assertIn('"type": "module"', package)
        self.assertIn('"typecheck": "tsc --noEmit"', package)
        self.assertTrue(form_path.exists())
        form = form_path.read_text(encoding="utf-8")
        self.assertIn("export type ApiKeyFormValues", form)
        self.assertIn("export function createApiKeyInputFromForm", form)
        self.assertIn("export function createApiKeyInputsFromForm", form)
        self.assertIn("DEFAULT_API_KEY_MODALITIES", form)
        self.assertNotIn("FormData", form)

        self.assertIn("createApiKeyInputsFromForm", view)
        self.assertIn("type ApiKeyFormValues", view)
        self.assertIn("CreateKeyDrawer, type ApiKeyFormValues", view)
        create_submit_body = view.split("const handleCreateSubmit", 1)[1].split("const handleEditSubmit", 1)[0]
        self.assertIn("for (const input of createApiKeyInputsFromForm(data))", create_submit_body)
        self.assertIn("ApiKeyService.createKey(input)", create_submit_body)
        self.assertNotIn("data.createCount > 1 ? `${data.name} ${index + 1}` : data.name", create_submit_body)
        self.assertNotIn("modalities: data.modalities", create_submit_body)
        self.assertNotIn("quota: data.quota", create_submit_body)
        self.assertNotIn("ipLimit: data.ipLimit", create_submit_body)
        self.assertNotIn("expires: data.expires", create_submit_body)

        self.assertIn("export type ApiKeyFormValues", drawer)
        self.assertNotIn("export interface CreateKeyFormData", drawer)
        self.assertIn("onSubmit?: (data: ApiKeyFormValues) => void | Promise<void>", drawer)

        self.assertIn("portal api key runtime tests", verifier)
        self.assertIn("api-key-runtime.test.ts", verifier)
        self.assertIn("verification plan includes portal api key runtime tests before broad suites", product_tests)

    def test_app_api_key_management_exposes_copyable_owner_key_without_legacy_fields(self) -> None:
        contract = (
            ROOT / "docs" / "schema-registry" / "frontend-field-contracts.yaml"
        ).read_text(encoding="utf-8")
        contract_payload = load_frontend_field_contract(
            ROOT,
            ROOT / "docs" / "schema-registry" / "frontend-field-contracts.yaml",
        )
        api_key_route = (
            ROOT / "services" / "sdkwork-clawrouter-router-service" / "src" / "api" / "app_api_keys.rs"
        ).read_text(encoding="utf-8")
        database_route_test = (
            ROOT / "services" / "sdkwork-clawrouter-app-api-server" / "tests" / "database_config_router.rs"
        ).read_text(encoding="utf-8")
        service = (
            ROOT
            / "apps"
            / "sdkwork-clawrouter-pc"
            / "packages"
            / "sdkwork-clawrouter-pc-console-api-keys"
            / "src"
            / "apiKeyService.ts"
        ).read_text(encoding="utf-8")
        view = (
            ROOT
            / "apps"
            / "sdkwork-clawrouter-pc"
            / "packages"
            / "sdkwork-clawrouter-pc-console-api-keys"
            / "src"
            / "ApiKeysView.tsx"
        ).read_text(encoding="utf-8")
        drawer = (
            ROOT
            / "apps"
            / "sdkwork-clawrouter-pc"
            / "packages"
            / "sdkwork-clawrouter-pc-console-api-keys"
            / "src"
            / "CreateKeyDrawer.tsx"
        ).read_text(encoding="utf-8")
        access_domain = (
            ROOT
            / "services"
            / "sdkwork-clawrouter-router-service"
            / "src"
            / "domain"
            / "access.rs"
        ).read_text(encoding="utf-8")

        self.assertIn("copyableKey:", contract)
        console_api_key_model = next(
            model
            for model in contract_payload["frontend_models"]
            if model.get("source")
            == "apps/sdkwork-clawrouter-pc/packages/sdkwork-clawrouter-pc-console-api-keys/src/apiKeyService.ts"
            and model.get("interface") == "ApiKey"
        )
        console_api_key_fields = console_api_key_model["fields"]
        for field in [
            "id",
            "name",
            "maskedKey",
            "copyableKey",
            "channelGroup",
            "channelGroupName",
            "rate",
            "quota",
            "usedQuota",
            "modalities",
            "ipLimit",
            "created",
            "expires",
            "status",
            "defaultForRuntime",
        ]:
            self.assertIn(field, console_api_key_fields)
        self.assertNotIn("fields: [id, name, keyVal, fullKey", contract)
        self.assertIn(
            "description: Full raw API key secret returned by create responses. Authenticated owner management list and update responses also expose this value as item.copyableKey for console copy actions.",
            contract,
        )

        self.assertIn("masked_key: String", api_key_route)
        self.assertIn("let masked_key = api_key.masked_key();", api_key_route)
        self.assertIn("copyable_key: Option<String>", api_key_route)
        self.assertIn("public_catalog_list_response", api_key_route)
        self.assertIn("item.copyable_key = None", api_key_route)
        self.assertNotIn("key_val: String", api_key_route)
        self.assertNotIn("full_key: String", api_key_route)
        self.assertNotIn("key_val: masked_key", api_key_route)
        self.assertNotIn("full_key: masked_key", api_key_route)

        self.assertIn('keys_payload["data"]["items"][0]["name"]', database_route_test)
        self.assertIn('keys_payload["data"]["items"][0]["copyableKey"]', database_route_test)
        self.assertNotIn('keys_payload["data"]["items"][0]["apiKey"]', database_route_test)
        self.assertNotIn('keys_payload["data"]["items"][0]["keyVal"]', database_route_test)
        self.assertNotIn('keys_payload["data"]["items"][0]["fullKey"]', database_route_test)

        self.assertIn("maskedKey: string", service)
        self.assertIn("copyableKey: string | null", service)
        self.assertIn("defaultForRuntime: SdkAppApiKeyItem['defaultForRuntime'];", service)
        self.assertIn("defaultForRuntime?: boolean", service)
        self.assertIn("displayName: string;", service)
        self.assertIn("displayName: readApiKeyDisplayName(id, name)", service)
        self.assertIn("function readApiKeyDisplayName(id: string, name: string): string", service)
        self.assertNotIn("isSecretLikeApiKeyName", service)
        self.assertNotIn("maskedKey", service.split("function readApiKeyDisplayName", 1)[1].split("function", 1)[0])
        self.assertIn("readRequiredString(value, 'id', 'API key id is required')", service)
        self.assertIn(
            "readRequiredString(value, 'maskedKey', 'API key masked value is required')",
            service,
        )
        self.assertIn(
            "copyableKey: readNullableString(value, 'copyableKey')",
            service,
        )
        self.assertIn("channelGroup: string;", service)
        self.assertIn("channelGroupName: string | null;", service)
        self.assertIn(
            "channelGroup: readRequiredString(value, 'channelGroup', 'API key channel group is required')",
            service,
        )
        self.assertIn(
            "channelGroupName: readNullableString(value, 'channelGroupName')",
            service,
        )
        self.assertIn(
            "defaultForRuntime: readBoolean(value, 'defaultForRuntime')",
            service,
        )
        self.assertIn(
            "request.defaultForRuntime = Boolean(input.defaultForRuntime);",
            service,
        )
        self.assertIn(
            "request.channelGroup = optionalText(input.channelGroup) ?? DEFAULT_CHANNEL_GROUP;",
            service,
        )
        self.assertIn(
            "channelGroup: optionalText(input.channelGroup) ?? DEFAULT_CHANNEL_GROUP,",
            service,
        )
        self.assertNotIn("API key copyable value is required", service)
        self.assertNotIn("keyVal: string", service)
        self.assertNotIn("fullKey: string", service)
        self.assertNotIn("readString(value, 'keyVal')", service)
        self.assertNotIn("fullKey: keyVal", service)
        self.assertNotIn("group?: string", service)
        self.assertNotIn("groupName?: string | null", service)
        self.assertNotIn("request.group =", service)
        self.assertNotIn("group: optionalText(input.channelGroup)", service)
        self.assertNotIn("readNullableString(value, 'groupName')", service)
        self.assertNotIn("readString(value, 'group')", service)

        self.assertIn("key.maskedKey", view)
        self.assertIn("key.displayName.toLowerCase().includes(query)", view)
        self.assertIn("{key.displayName}", view)
        self.assertNotIn("{key.name}</span>", view)
        self.assertIn("text={key.copyableKey ?? ''}", view)
        self.assertIn("disabled={!key.copyableKey}", view)
        self.assertIn("handleSetDefaultRuntimeKey", view)
        self.assertIn("ApiKeyService.updateKey(key.id, { defaultForRuntime: true })", view)
        self.assertIn("console.apiKeys.runtimeDefault", view)
        self.assertIn("console.apiKeys.copyKey", view)
        self.assertNotIn("visibleKeys", view)
        self.assertNotIn("toggleVisibility", view)
        self.assertNotIn("Eye,", view)
        self.assertNotIn("EyeOff", view)
        self.assertNotIn("Copy token", view)
        self.assertNotIn("Show token", view)
        self.assertNotIn("Hide token", view)
        self.assertNotIn("text={key.maskedKey}", view)

        self.assertIn("value={initialData.maskedKey}", drawer)
        self.assertIn("setName(initialData.displayName)", drawer)
        self.assertIn("copyText={initialData.copyableKey}", drawer)
        self.assertIn("copyLabel={t('console.apiKeys.copyKey', '复制密钥')}", drawer)
        self.assertIn("copyDisabled={!initialData.copyableKey}", drawer)
        self.assertNotIn("initialData.fullKey", drawer)
        self.assertNotIn("initialData.keyVal", drawer)
        self.assertIn('format!("API Key #{}", self.id)', access_domain)
        self.assertNotIn("self.key_prefix.clone()", access_domain.split("pub fn display_name(&self)", 1)[1].split("pub fn masked_key(&self)", 1)[0])

    def test_app_api_key_public_contract_uses_channel_group_fields_only(self) -> None:
        contract = (
            ROOT / "docs" / "schema-registry" / "frontend-field-contracts.yaml"
        ).read_text(encoding="utf-8")

        self.assertIn("operation_id: channelGroups.list", contract)
        self.assertIn("api_path: /app/v3/api/ai/channel_groups", contract)
        self.assertIn("- channelGroup", contract)
        self.assertIn("- channelGroupName", contract)
        self.assertIn("channelGroup:", contract)
        self.assertIn("channelGroupName:", contract)
        self.assertNotIn("operation_id: " + "api" + "Key" + "Groups.list", contract)
        self.assertNotIn("api_path: /app/v3/api/iam/" + "api_" + "key_" + "groups", contract)
        self.assertNotIn("App" + "Api" + "Key" + "Group", contract)
        self.assertNotIn("Api" + "Key" + "Group", contract)
        source_marker = (
            "source: apps/sdkwork-clawrouter-pc/packages/"
            "sdkwork-clawrouter-pc-console-api-keys/src/apiKeyService.ts"
        )
        console_api_key_contract = "\n".join(
            block.split("\n- route:", 1)[0] for block in contract.split(source_marker)[1:]
        )
        self.assertNotIn("\n      group:\n", console_api_key_contract)
        self.assertNotIn("\n      groupName:\n", console_api_key_contract)

    def test_channel_group_naming_has_no_legacy_group_debt(self) -> None:
        forbidden_terms = [
            "Api" + "Key" + "Group",
            "api" + "Key" + "Group",
            "api_" + "key_" + "group",
            "api-" + "key-" + "group",
            "API " + "key " + "group",
            "API " + "Key " + "Group",
            "api " + "key " + "group",
        ]
        scanned_roots = [
            ROOT / "apps",
            ROOT / "crates",
            ROOT / "docs",
            ROOT / "generated",
            ROOT / "sdks",
            ROOT / "services",
            ROOT / "tests",
            ROOT / "tools",
        ]
        ignored_dirs = {".git", "node_modules", "target", "dist", "build", ".venv", "__pycache__"}
        text_suffixes = {
            ".cs",
            ".dart",
            ".go",
            ".java",
            ".json",
            ".kt",
            ".md",
            ".mjs",
            ".py",
            ".rs",
            ".sql",
            ".toml",
            ".ts",
            ".tsx",
            ".txt",
            ".yaml",
            ".yml",
        }
        violations: list[str] = []

        for root in scanned_roots:
            if not root.exists():
                continue
            for directory, dir_names, file_names in os.walk(root):
                dir_names[:] = [name for name in dir_names if name not in ignored_dirs]
                for file_name in file_names:
                    path = Path(directory) / file_name
                    if path.suffix not in text_suffixes:
                        continue
                    if any(part in ignored_dirs for part in path.relative_to(ROOT).parts):
                        continue
                    content = path.read_text(encoding="utf-8", errors="ignore")
                    for term in forbidden_terms:
                        if term in content:
                            violations.append(f"{path.relative_to(ROOT).as_posix()}: {term}")
                    continue

        self.assertEqual(
            [],
            violations,
            "Channel-group code, contracts, generated artifacts, and tests must not retain legacy group naming.",
        )

    def test_app_api_key_creation_persists_idempotency_and_audit_request_id(self) -> None:
        schema = render_schema_registry(
            ROOT / "docs" / "schema-registry" / "sdkwork-clawrouter.tables.yaml"
        )
        postgres_schema = (
            ROOT / "generated" / "schema" / "postgres" / "schema.sql"
        ).read_text(encoding="utf-8")
        api_key_route = (
            ROOT / "services" / "sdkwork-clawrouter-router-service" / "src" / "api" / "app_api_keys.rs"
        ).read_text(encoding="utf-8")

        self.assertIn("idempotency_key: string(128)", schema)
        api_key_table = schema.split("- table: iam_gateway_api_key", 1)[1].split("- table:", 1)[0]
        required_columns = api_key_table.split("required_columns:", 1)[1].split("indexes:", 1)[0]
        for column in ["tenant_id", "organization_id", "user_id", "idempotency_key"]:
            self.assertIn(f"- {column}", required_columns)
        self.assertIn("idempotency_key VARCHAR(128) NOT NULL", postgres_schema)
        self.assertIn("tenant_id BIGINT NOT NULL", postgres_schema)
        self.assertIn("organization_id BIGINT NOT NULL", postgres_schema)
        self.assertIn("user_id BIGINT NOT NULL", postgres_schema)
        self.assertIn("uk_iam_gateway_api_key_idempotency", schema)
        idempotency_index = api_key_table.split("name: uk_iam_gateway_api_key_idempotency", 1)[1]
        self.assertIn("- tenant_id", idempotency_index)
        self.assertIn("- idempotency_key", idempotency_index)
        self.assertIn(
            "uk_iam_gateway_api_key_idempotency ON iam_gateway_api_key (tenant_id, idempotency_key)",
            postgres_schema,
        )
        self.assertIn("HeaderMap", api_key_route)
        self.assertIn("TrustedRequestSubject", api_key_route)
        self.assertIn("normalize_idempotency_key", api_key_route)
        self.assertIn("generate_server_request_id", api_key_route)
        self.assertNotIn("normalize_request_id", api_key_route)
        self.assertNotIn("REQUEST_ID_HEADER", api_key_route)

        for relative_path in [
            "services/sdkwork-clawrouter-router-service/src/ports/api_key_command_store.rs",
            "services/sdkwork-clawrouter-router-service/src/infrastructure/sql/sqlite/api_key_command_store.rs",
            "services/sdkwork-clawrouter-router-service/src/infrastructure/sql/postgres/api_key_command_store.rs",
        ]:
            source = (ROOT / relative_path).read_text(encoding="utf-8")
            with self.subTest(path=relative_path):
                self.assertIn("tenant_id", source)
                self.assertIn("organization_id", source)
                self.assertIn("user_id", source)
                self.assertIn("operator_id", source)
                self.assertIn("operator_type", source)
                self.assertIn("idempotency_key", source)
                self.assertIn("request_id", source)

    def test_app_api_key_multi_group_bindings_are_in_database_schema(self) -> None:
        schema = render_schema_registry(
            ROOT / "docs" / "schema-registry" / "sdkwork-clawrouter.tables.yaml"
        )
        effective_schema = (
            ROOT / "generated" / "schema" / "registry" / "sdkwork-clawrouter.tables.effective.yaml"
        ).read_text(encoding="utf-8")
        postgres_schema = (
            ROOT / "generated" / "schema" / "postgres" / "schema.sql"
        ).read_text(encoding="utf-8")

        for source in [schema, effective_schema]:
            with self.subTest(source="schema-registry"):
                self.assertIn("- table: iam_gateway_api_key_channel_group", source)
                binding_table = source.split(
                    "- table: iam_gateway_api_key_channel_group", 1
                )[1].split("- table:", 1)[0]
                for column in [
                    "api_key_id",
                    "channel_group_id",
                    "channel_group_code",
                    "binding_role",
                    "routing_strategy",
                    "priority",
                    "weight",
                    "effective_from",
                    "effective_to",
                ]:
                    self.assertIn(column, binding_table)

        self.assertIn(
            "CREATE TABLE IF NOT EXISTS iam_gateway_api_key_channel_group",
            postgres_schema,
        )
        self.assertIn("api_key_id BIGINT NOT NULL", postgres_schema)
        self.assertIn("channel_group_id BIGINT NOT NULL", postgres_schema)
        self.assertIn(
            "idx_iam_gateway_api_key_channel_group_active",
            postgres_schema,
        )

    def test_app_api_key_creation_uses_signed_trusted_subject_boundary(self) -> None:
        service = ROOT / "crates" / "sdkwork-routes-clawrouter-app-api" / "src" / "routes.rs"
        service_source = service.read_text(encoding="utf-8")
        route_test = ROOT / "services" / "sdkwork-clawrouter-app-api-server" / "tests" / "database_config_router.rs"
        route_test_source = route_test.read_text(encoding="utf-8")
        http_auth = ROOT / "crates" / "sdkwork-claw-http" / "src" / "auth.rs"
        http_auth_source = http_auth.read_text(encoding="utf-8")
        config_lib = ROOT / "crates" / "sdkwork-claw-config" / "src" / "lib.rs"
        config_source = config_lib.read_text(encoding="utf-8")

        self.assertIn("TrustedSubjectConfig", config_source)
        self.assertIn("TrustedSubjectConfig", service_source)
        self.assertIn("AppSubjectBoundaryConfig", service_source)
        self.assertIn("app_request_subject_boundary", service_source)
        self.assertIn("from_fn_with_state", service_source)
        self.assertIn("trusted_request_subject_boundary", http_auth_source)
        self.assertIn("sign_trusted_request_subject", http_auth_source)
        self.assertIn("attach_trusted_request_subject", http_auth_source)
        self.assertIn("session_authorization_header", route_test_source)
        self.assertIn("database_config_app_api_keys_are_not_mounted_locally", route_test_source)
        self.assertNotIn('header("x-sdkwork-tenant-id", "10")', route_test_source)
        self.assertNotIn("x-sdkwork-tenant-id header is required", route_test_source)

    def test_app_api_key_creation_accepts_app_session_boundary_not_frontend_tenant_claims(self) -> None:
        config_lib = ROOT / "crates" / "sdkwork-claw-config" / "src" / "lib.rs"
        config_source = config_lib.read_text(encoding="utf-8")
        http_auth = ROOT / "crates" / "sdkwork-claw-http" / "src" / "auth.rs"
        http_auth_source = http_auth.read_text(encoding="utf-8")
        service = ROOT / "crates" / "sdkwork-routes-clawrouter-app-api" / "src" / "routes.rs"
        service_source = service.read_text(encoding="utf-8")
        route_test = ROOT / "services" / "sdkwork-clawrouter-app-api-server" / "tests" / "database_config_router.rs"
        route_test_source = route_test.read_text(encoding="utf-8")
        sdk_clients = (
            ROOT
            / "apps"
            / "sdkwork-clawrouter-pc"
            / "packages"
            / "sdkwork-clawroutes-pc-commons"
            / "src"
            / "sdk-clients.ts"
        ).read_text(encoding="utf-8")

        self.assertIn("AppSessionConfig", config_source)
        self.assertIn("AppSubjectBoundaryConfig", http_auth_source)
        self.assertIn("sign_app_session_token", http_auth_source)
        self.assertIn("verify_app_session_token", http_auth_source)
        self.assertIn("parse_app_session_authorization_bearer", http_auth_source)
        self.assertIn("app_request_subject_boundary", http_auth_source)
        self.assertIn("split_whitespace()", http_auth_source)
        self.assertIn('eq_ignore_ascii_case("bearer")', http_auth_source)
        self.assertIn("headers.remove(AUTHORIZATION);", http_auth_source)
        self.assertIn("AppSessionConfig", service_source)
        self.assertIn("app_request_subject_boundary", service_source)
        self.assertIn("session_authorization_header", route_test_source)
        self.assertIn("database_config_app_iam_directory_requires_session_and_lists_subject_directory", route_test_source)
        self.assertIn("database_config_password_login_issues_app_session_and_records_password_provider_event", route_test_source)
        self.assertIn('assert!(!body_text.contains("Other User"));', route_test_source)
        self.assertIn("verify_dual_app_session_headers(headers", http_auth_source)
        self.assertNotIn(
            "if !has_dual_app_session_token_headers(headers) {\n        return Ok(());\n    }",
            http_auth_source,
        )
        self.assertNotIn("tenantId?:", sdk_clients)
        self.assertNotIn("organizationId?:", sdk_clients)
        self.assertNotIn("tenantId: options.tenantId", sdk_clients)
        self.assertNotIn("organizationId: options.organizationId", sdk_clients)

    def test_product_direct_handler_tests_use_internal_subject_helper(self) -> None:
        product_tests = ROOT / "services" / "sdkwork-clawrouter-router-service" / "tests"
        common = (product_tests / "common" / "mod.rs").read_text(encoding="utf-8")

        self.assertIn("InternalTrustedSubjectHeaders", common)
        self.assertIn('concat!("x-sdkwork-", "tenant-id")', common)

        for path in product_tests.rglob("*.rs"):
            source = path.read_text(encoding="utf-8")
            with self.subTest(path=path.relative_to(ROOT)):
                if path.name == "mod.rs" and path.parent.name == "common":
                    continue
                self.assertNotIn("x-sdkwork-tenant-id", source)
                self.assertNotIn("x-sdkwork-organization-id", source)
                self.assertNotIn("x-sdkwork-user-id", source)


if __name__ == "__main__":
    unittest.main()
