import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]


class SettingsRuntimeStandardTest(unittest.TestCase):
    def test_console_settings_contract_and_frontend_use_typed_app_sdk(self) -> None:
        contract = (ROOT / "docs" / "schema-registry" / "frontend-field-contracts.yaml").read_text(
            encoding="utf-8"
        )
        settings_service = (
            ROOT
            / "apps"
            / "sdkwork-clawrouter-pc"
            / "packages"
            / "sdkwork-clawrouter-pc-console-settings"
            / "src"
            / "settingsService.ts"
        ).read_text(encoding="utf-8")
        iam_api = (ROOT / "sdks" / "clawrouter-app-sdk" / "clawrouter-app-sdk-typescript" / "src" / "api" / "iam.ts").read_text(
            encoding="utf-8"
        )
        type_exports = (
            ROOT / "sdks" / "clawrouter-app-sdk" / "clawrouter-app-sdk-typescript" / "src" / "types" / "index.ts"
        ).read_text(encoding="utf-8")

        self.assertIn("operation: updateSettings", contract)
        self.assertIn("request_schema:", contract)
        self.assertIn("name: UpdateSettingsRequest", contract)
        self.assertIn("name: UpdateSettingsResponse", contract)
        self.assertIn("getClawRouterAppSdkClient().iam.users.settings.update(toUpdateSettingsRequest(data))", settings_service)
        self.assertIn("function toUpdateSettingsRequest(data: SettingsData): SdkUpdateSettingsRequest", settings_service)
        self.assertNotIn("as unknown as Record<string, unknown>", settings_service)
        self.assertNotIn("fetch('/app/v3/api", settings_service)
        self.assertNotIn("axios", settings_service)

        self.assertIn("UpdateSettingsRequest", iam_api)
        self.assertIn("UsersSettingsUpdateResult", iam_api)
        self.assertIn(
            "async update(body: UpdateSettingsRequest): Promise<UsersSettingsUpdateResult>",
            iam_api,
        )
        self.assertIn("this.client.put<UsersSettingsUpdateResult>", iam_api)
        self.assertIn("appApiPath(`/iam/users/settings`)", iam_api)
        self.assertNotIn("async updateSettings(body?: OperationRequest): Promise<PlusApiResult>", iam_api)
        self.assertIn("export type { UpdateSettingsRequest }", type_exports)
        self.assertIn("export type { UpdateSettingsResponse }", type_exports)
        self.assertIn("export type { UsersSettingsUpdateResult }", type_exports)

    def test_console_settings_ui_has_retryable_load_and_awaited_saves(self) -> None:
        settings_view = (
            ROOT
            / "apps"
            / "sdkwork-clawrouter-pc"
            / "packages"
            / "sdkwork-clawrouter-pc-console-settings"
            / "src"
            / "SettingsView.tsx"
        ).read_text(encoding="utf-8")

        self.assertIn("BusinessStatePanel", settings_view)
        self.assertIn("loadSettings", settings_view)
        self.assertIn("loadError", settings_view)
        self.assertIn("saveError", settings_view)
        self.assertIn("onRetry={() => void loadSettings()}", settings_view)
        self.assertIn("const handleSave = async ()", settings_view)
        self.assertIn("await SettingsService.updateSettings(data)", settings_view)
        self.assertIn("const handleNotificationToggle = async", settings_view)
        self.assertIn("await SettingsService.updateSettings(nextData)", settings_view)
        self.assertIn("setData(previousData)", settings_view)
        self.assertNotIn("alert(", settings_view)
        self.assertNotIn("SettingsService.fetchSettings().then", settings_view)
        self.assertNotIn("SettingsService.updateSettings({ ...data, notifications: newNotif });", settings_view)

    def test_console_settings_product_states_are_localized(self) -> None:
        settings_view = (
            ROOT
            / "apps"
            / "sdkwork-clawrouter-pc"
            / "packages"
            / "sdkwork-clawrouter-pc-console-settings"
            / "src"
            / "SettingsView.tsx"
        ).read_text(encoding="utf-8")
        settings_service = (
            ROOT
            / "apps"
            / "sdkwork-clawrouter-pc"
            / "packages"
            / "sdkwork-clawrouter-pc-console-settings"
            / "src"
            / "settingsService.ts"
        ).read_text(encoding="utf-8")
        i18n = (
            ROOT
            / "apps"
            / "sdkwork-clawrouter-pc"
            / "packages"
            / "sdkwork-clawrouter-pc-i18n"
            / "src"
            / "index.ts"
        ).read_text(encoding="utf-8")

        for marker in [
            "console.settings.states.loading",
            "console.settings.states.loadErrorTitle",
            "console.settings.states.loadErrorFallback",
            "console.settings.states.saveErrorFallback",
            "console.settings.states.saved",
        ]:
            self.assertIn(marker, settings_view + settings_service + i18n)
            self.assertGreaterEqual(i18n.count(f'"{marker}"'), 2)

        for hardcoded_copy in [
            "Loading settings...",
            "Settings could not be loaded",
            "Failed to load console settings.",
            "Failed to save settings.",
            "Settings saved.",
            "Failed to fetch settings",
        ]:
            self.assertNotIn(hardcoded_copy, settings_view)
            self.assertNotIn(hardcoded_copy, settings_service)

    def test_console_settings_has_real_app_backend_route_and_sql_stores(self) -> None:
        product_api_mod = (
            ROOT / "services" / "sdkwork-clawrouter-router-service" / "src" / "api" / "mod.rs"
        ).read_text(encoding="utf-8")
        app_api = (ROOT / "services" / "sdkwork-clawrouter-app-api-server" / "src" / "lib.rs").read_text(
            encoding="utf-8"
        )
        ports_mod = (ROOT / "services" / "sdkwork-clawrouter-router-service" / "src" / "ports" / "mod.rs").read_text(
            encoding="utf-8"
        )
        settings_port = (
            ROOT / "services" / "sdkwork-clawrouter-router-service" / "src" / "ports" / "settings_store.rs"
        ).read_text(encoding="utf-8")
        app_settings = (
            ROOT / "services" / "sdkwork-clawrouter-router-service" / "src" / "api" / "app_settings.rs"
        ).read_text(encoding="utf-8")
        sqlite_store = (
            ROOT
            / "services"
            / "sdkwork-clawrouter-router-service"
            / "src"
            / "infrastructure"
            / "sql"
            / "sqlite"
            / "settings_store.rs"
        ).read_text(encoding="utf-8")
        postgres_store = (
            ROOT
            / "services"
            / "sdkwork-clawrouter-router-service"
            / "src"
            / "infrastructure"
            / "sql"
            / "postgres"
            / "settings_store.rs"
        ).read_text(encoding="utf-8")

        self.assertIn("app_settings_router", product_api_mod)
        self.assertIn("app_settings_router_with_store", product_api_mod)
        self.assertIn("app_settings_router()", app_api)
        self.assertIn("app_settings_router_with_store", app_api)
        self.assertIn("SqliteSettingsStore", app_api)
        self.assertIn("PostgresSettingsStore", app_api)

        self.assertIn("SettingsStore", ports_mod)
        self.assertIn("SettingsSubject", ports_mod)
        self.assertIn("SettingsData", settings_port)
        self.assertIn("SettingsNotifications", settings_port)
        self.assertIn("UpdateSettingsCommand", settings_port)
        self.assertIn("UpdateSettingsOutcome", settings_port)

        self.assertIn('"/app/v3/api/iam/users/settings"', app_settings)
        self.assertIn("validate_update_settings_request", app_settings)
        self.assertIn("webhook URL must use http or https", app_settings)
        self.assertIn('PlusApiResult::error("4001"', app_settings)
        self.assertIn('PlusApiResult::error("4010"', app_settings)
        self.assertIn('PlusApiResult::error("5000"', app_settings)

        for store in [sqlite_store, postgres_store]:
            self.assertIn("iam_user_preference", store)
            self.assertIn("integration_webhook_endpoint", store)
            self.assertIn("notification_preferences", store)
            self.assertIn("target_url", store)
            self.assertIn("event_types", store)
            self.assertIn("retry_policy", store)
            self.assertIn("upsert_user_preference", store)
            self.assertIn("upsert_webhook_endpoint", store)

    def test_console_settings_fetch_uses_precise_app_sdk_response_contract(self) -> None:
        contract = (ROOT / "docs" / "schema-registry" / "frontend-field-contracts.yaml").read_text(
            encoding="utf-8"
        )
        openapi = (ROOT / "generated" / "openapi" / "clawrouter-app-openapi.json").read_text(
            encoding="utf-8"
        )
        iam_api = (ROOT / "sdks" / "clawrouter-app-sdk" / "clawrouter-app-sdk-typescript" / "src" / "api" / "iam.ts").read_text(
            encoding="utf-8"
        )
        settings_service = (
            ROOT
            / "apps"
            / "sdkwork-clawrouter-pc"
            / "packages"
            / "sdkwork-clawrouter-pc-console-settings"
            / "src"
            / "settingsService.ts"
        ).read_text(encoding="utf-8")

        self.assertIn("name: SettingsDataResponse", contract)
        self.assertIn('"SettingsDataResponse"', openapi)
        self.assertIn('"UsersSettingsRetrieveResult"', openapi)
        self.assertIn('"$ref": "#/components/schemas/SettingsDataResponse"', openapi)
        self.assertIn("async retrieve(): Promise<UsersSettingsRetrieveResult>", iam_api)
        self.assertIn("get<UsersSettingsRetrieveResult>", iam_api)
        self.assertNotIn("fetchSettings(params?: QueryParams): Promise<PlusApiResult>", iam_api)

        result_path = ROOT / "sdks" / "clawrouter-app-sdk" / "clawrouter-app-sdk-typescript" / "src" / "types" / "users-settings-retrieve-result.ts"
        self.assertTrue(result_path.exists())
        self.assertIn("data?: SettingsDataResponse;", result_path.read_text(encoding="utf-8"))
        self.assertIn("getClawRouterAppSdkClient().iam.users.settings.retrieve()", settings_service)

        self.assertIn("SettingsDataResponse as SdkSettingsDataResponse", settings_service)
        self.assertIn("type SdkSettingsNotifications = SdkSettingsDataResponse['notifications'];", settings_service)
        self.assertIn("interface SettingsNotifications", settings_service)
        self.assertIn("billReminder: SdkSettingsNotifications['billReminder'];", settings_service)
        self.assertIn("quotaWarning: SdkSettingsNotifications['quotaWarning'];", settings_service)
        self.assertIn("apiMonitor: SdkSettingsNotifications['apiMonitor'];", settings_service)
        self.assertIn("language: SdkSettingsDataResponse['language'];", settings_service)
        self.assertIn("notifications: SettingsNotifications;", settings_service)


if __name__ == "__main__":
    unittest.main()
