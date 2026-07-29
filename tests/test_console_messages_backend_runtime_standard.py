import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]


class ConsoleMessagesBackendRuntimeStandardTest(unittest.TestCase):
    def test_console_notifications_are_backed_by_the_app_route_crate(self) -> None:
        api_mod = (
            ROOT / "services/sdkwork-clawrouter-router-service/src/api/mod.rs"
        ).read_text(encoding="utf-8")
        api = (
            ROOT / "services/sdkwork-clawrouter-router-service/src/api/app_notification.rs"
        ).read_text(encoding="utf-8")
        app_routes = (
            ROOT / "crates/sdkwork-routes-clawrouter-app-api/src/routes.rs"
        ).read_text(encoding="utf-8")

        self.assertIn("mod app_notification;", api_mod)
        self.assertIn("app_notification_router", api_mod)
        self.assertIn("app_notification_router_with_store", api_mod)
        self.assertIn("/app/v3/api/notification/notifications", api)
        self.assertIn("RequiredAppSqlScopedSubject", api)
        self.assertIn("ResolvedAppSqlScopedSubject", api)
        self.assertIn("AppNotificationStore", api)
        self.assertIn("EmptyAppNotificationStore", api)
        self.assertIn("parse_offset_list_query", api)
        self.assertIn("PostgresAppNotificationStore", app_routes)
        self.assertIn("app_notification_router_with_store", app_routes)
        self.assertNotIn("SqliteAppNotificationStore", app_routes)

    def test_console_notification_port_exposes_only_product_fields(self) -> None:
        ports_mod = (
            ROOT / "services/sdkwork-clawrouter-router-service/src/ports/mod.rs"
        ).read_text(encoding="utf-8")
        port = (
            ROOT
            / "services/sdkwork-clawrouter-router-service/src/ports/app_notification_store.rs"
        ).read_text(encoding="utf-8")

        self.assertIn("mod app_notification_store;", ports_mod)
        for export_name in [
            "AppNotificationItem",
            "AppNotificationItems",
            "AppNotificationQuery",
            "AppNotificationStore",
            "AppNotificationSubject",
        ]:
            self.assertIn(export_name, ports_mod)
            self.assertIn(export_name, port)

        for field_name in [
            "id",
            "app_id",
            "title",
            "desc",
            "content",
            "time",
            "message_type",
            "read",
            "show_as_popup",
            "popup_seen",
            "archived",
            "action_url",
        ]:
            self.assertIn(f"pub {field_name}:", port)
        self.assertIn('#[serde(rename = "type")]', port)
        self.assertIn('#[serde(rename_all = "camelCase")]', port)
        for internal_field in [
            "metadata",
            "failure_code",
            "retry_count",
            "recipient_role_code",
            "recipient_user_id",
        ]:
            self.assertNotIn(f"pub {internal_field}:", port)
        self.assertNotIn("mock", port.lower())

    def test_postgres_notification_store_enforces_scope_visibility_and_pagination(self) -> None:
        store = (
            ROOT
            / "services/sdkwork-clawrouter-router-service/src/infrastructure/sql/postgres/app_notification_store.rs"
        ).read_text(encoding="utf-8")

        self.assertIn("PostgresAppNotificationStore", store)
        for table in [
            "ops_notification_message",
            "ops_notification_recipient",
            "ops_notification_delivery",
            "iam_organization_membership",
        ]:
            self.assertIn(table, store)
        for scope_column in ["tenant_id", "organization_id", "user_id", "app_id"]:
            self.assertIn(scope_column, store)
        for pagination_marker in ["COUNT(*) OVER() AS total", "LIMIT $12 OFFSET $13"]:
            self.assertIn(pagination_marker, store)
        self.assertIn("RECIPIENT_ALL", store)
        self.assertIn("RECIPIENT_USER", store)
        self.assertIn("RECIPIENT_ROLE", store)
        self.assertIn("include_archived", store)
        self.assertIn("ON CONFLICT(tenant_id, organization_id, message_id, user_id, app_id, delivery_channel)", store)
        self.assertNotIn("SELECT *", store)

    def test_notification_read_model_fails_closed_for_type_and_severity(self) -> None:
        store = (
            ROOT
            / "services/sdkwork-clawrouter-router-service/src/infrastructure/sql/postgres/app_notification_store.rs"
        ).read_text(encoding="utf-8")
        compact_store = " ".join(store.split())

        self.assertIn("m.message_type AS message_type", store)
        self.assertIn("m.severity AS severity", store)
        self.assertNotIn("COALESCE(m.message_type, 1) AS message_type", store)
        self.assertNotIn("COALESCE(m.severity, 1) AS severity", store)
        self.assertIn(
            'notification_type_for_display( required_integer_cell(&row, "message_type")?, required_integer_cell(&row, "severity")?, )?',
            compact_store,
        )
        self.assertIn("fn notification_type_for_display", store)
        self.assertIn("fn validate_severity", store)
        self.assertIn("missing notification {column} from database row", store)
        self.assertIn("invalid notification message_type from database row", store)
        self.assertIn("invalid notification severity from database row", store)

    def test_generated_app_sdk_and_frontend_use_notification_surface(self) -> None:
        contract = (
            ROOT / "docs/schema-registry/frontend-field-contracts.yaml"
        ).read_text(encoding="utf-8")
        openapi = (
            ROOT / "generated/openapi/clawrouter-app-openapi.json"
        ).read_text(encoding="utf-8")
        sdk_notification = (
            ROOT
            / "sdks/clawrouter-app-sdk/clawrouter-app-sdk-typescript/src/api/notification.ts"
        ).read_text(encoding="utf-8")
        notification_service = (
            ROOT
            / "apps/sdkwork-clawrouter-pc/packages/sdkwork-clawroutes-pc-commons/src/notificationService.ts"
        ).read_text(encoding="utf-8")

        self.assertIn("api_path: /app/v3/api/notification/notifications", contract)
        self.assertIn('"/app/v3/api/notification/notifications"', openapi)
        self.assertIn("class NotificationApi", sdk_notification)
        self.assertIn("appApiPath(`/notification/notifications`)", sdk_notification)
        self.assertIn("getClawRouterAppSdkClient()", notification_service)
        self.assertIn("appSdkClient.notification.list", notification_service)
        self.assertIn("appSdkClient.notification.acknowledge.create", notification_service)
        self.assertIn("appSdkClient.notification.popupSeen.create", notification_service)
        self.assertNotIn("fetch(", notification_service)
        self.assertNotIn("axios", notification_service)


if __name__ == "__main__":
    unittest.main()
