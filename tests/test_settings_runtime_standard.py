import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
ROUTER_SERVICE = ROOT / "services" / "sdkwork-clawrouter-router-service"
APP_SDK = (
    ROOT
    / "sdks"
    / "clawrouter-app-sdk"
    / "clawrouter-app-sdk-typescript"
    / "generated"
    / "server-openapi"
    / "src"
)


class SettingsRuntimeStandardTest(unittest.TestCase):
    def test_settings_contract_has_precise_read_update_and_required_body_schemas(self) -> None:
        contract = (
            ROOT / "docs" / "schema-registry" / "frontend-field-contracts.yaml"
        ).read_text(encoding="utf-8")
        read_start = contract.index("- route: /console/settings\n")
        update_start = contract.index("- route: /console/settings\n", read_start + 1)
        read_contract = contract[read_start:update_start]
        update_contract = contract[update_start : update_start + 2500]

        self.assertIn("name: SettingsDataResponse", read_contract)
        for field in [
            "language",
            "timezone",
            "webhookUrl",
            "billReminder",
            "quotaWarning",
            "apiMonitor",
        ]:
            self.assertIn(field, read_contract)
        self.assertIn("operation_id: users.settings.update", update_contract)
        self.assertIn("name: UpdateSettingsRequest", update_contract)
        self.assertIn("name: UpdateSettingsResponse", update_contract)
        self.assertIn("request_body_required: true", update_contract)
        self.assertIn("required: [success]", update_contract)

    def test_generated_settings_sdk_returns_unwrapped_precise_types(self) -> None:
        openapi = (
            ROOT / "generated" / "openapi" / "clawrouter-app-openapi.json"
        ).read_text(encoding="utf-8")
        iam_api = (APP_SDK / "api" / "iam.ts").read_text(encoding="utf-8")
        type_exports = (APP_SDK / "types" / "index.ts").read_text(encoding="utf-8")

        for schema in [
            "SettingsDataResponse",
            "UpdateSettingsRequest",
            "UpdateSettingsResponse",
        ]:
            self.assertIn(f'"{schema}"', openapi)
            self.assertIn(f"export type {{ {schema} }}", type_exports)
        self.assertIn("async retrieve(requestOptions?: ApiRequestOptions): Promise<SettingsDataResponse>", iam_api)
        self.assertIn(
            "async update(body: UpdateSettingsRequest, requestOptions?: ApiRequestOptions): Promise<UpdateSettingsResponse>",
            iam_api,
        )
        self.assertIn("body, contentType: 'application/json'", iam_api)
        self.assertNotIn("Promise<Record<string, never>>", iam_api[iam_api.index("class IamUsersSettingsApi") : iam_api.index("class IamUsersApi")])

    def test_console_settings_consumes_generated_sdk_without_raw_http_or_double_unwrap(self) -> None:
        settings_service = (
            ROOT
            / "apps"
            / "sdkwork-clawrouter-pc"
            / "packages"
            / "sdkwork-clawrouter-pc-console-settings"
            / "src"
            / "settingsService.ts"
        ).read_text(encoding="utf-8")
        console_core = (
            ROOT
            / "apps"
            / "sdkwork-clawrouter-pc"
            / "packages"
            / "sdkwork-clawrouter-pc-console-core"
            / "src"
            / "sdk"
            / "index.ts"
        ).read_text(encoding="utf-8")

        self.assertIn("SettingsDataResponse as SdkSettingsDataResponse", settings_service)
        self.assertIn("UpdateSettingsRequest as SdkUpdateSettingsRequest", settings_service)
        self.assertIn("UpdateSettingsResponse as SdkUpdateSettingsResponse", settings_service)
        self.assertIn("return normalizeSettings(result)", settings_service)
        self.assertIn("result.success !== true", settings_service)
        self.assertNotIn("readRequiredApiItem", settings_service)
        self.assertNotIn("ensureSdkworkApiSuccess", settings_service)
        self.assertNotIn("fetch('/app/v3/api", settings_service)
        self.assertNotIn("axios", settings_service)
        for sdk_type in [
            "SettingsDataResponse",
            "UpdateSettingsRequest",
            "UpdateSettingsResponse",
        ]:
            self.assertIn(sdk_type, console_core)

    def test_settings_backend_uses_postgres_store_and_real_subject_scoping(self) -> None:
        api_mod = (ROUTER_SERVICE / "src" / "api" / "mod.rs").read_text(encoding="utf-8")
        app_settings = (ROUTER_SERVICE / "src" / "api" / "app_settings.rs").read_text(
            encoding="utf-8"
        )
        settings_port = (
            ROUTER_SERVICE / "src" / "ports" / "settings_store.rs"
        ).read_text(encoding="utf-8")
        postgres_store = (
            ROUTER_SERVICE
            / "src"
            / "infrastructure"
            / "sql"
            / "postgres"
            / "settings_store.rs"
        ).read_text(encoding="utf-8")
        routes = (
            ROOT / "crates" / "sdkwork-routes-clawrouter-app-api" / "src" / "routes.rs"
        ).read_text(encoding="utf-8")

        self.assertIn("app_settings_router_with_store", api_mod)
        self.assertIn('"/app/v3/api/iam/users/settings"', app_settings)
        self.assertIn("RequiredAppSqlScopedSubject", app_settings)
        self.assertIn("SettingsData", settings_port)
        self.assertIn("UpdateSettingsOutcome", settings_port)
        for table in ["iam_user_preference", "integration_webhook_endpoint"]:
            self.assertIn(table, postgres_store)
        for scope in ["tenant_id", "organization_id", "user_id"]:
            self.assertIn(scope, postgres_store)
        self.assertEqual(3, routes.count("PostgresSettingsStore::new"))
        self.assertNotIn("SqliteSettingsStore", routes)


if __name__ == "__main__":
    unittest.main()
