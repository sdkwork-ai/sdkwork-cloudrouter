import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]


class ConsoleMessagesBackendRuntimeStandardTest(unittest.TestCase):
    def test_console_messages_operation_is_backed_by_real_app_api_router(self) -> None:
        product_api_mod = (
            ROOT / "services" / "sdkwork-clawrouter-router-service" / "src" / "api" / "mod.rs"
        ).read_text(encoding="utf-8")
        app_api = (ROOT / "services" / "sdkwork-clawrouter-app-api-server" / "src" / "lib.rs").read_text(
            encoding="utf-8"
        )
        app_messages_path = (
            ROOT / "services" / "sdkwork-clawrouter-router-service" / "src" / "api" / "app_messages.rs"
        )

        self.assertTrue(app_messages_path.exists())
        app_messages = app_messages_path.read_text(encoding="utf-8")

        self.assertIn("mod app_messages;", product_api_mod)
        self.assertIn("app_messages_router", product_api_mod)
        self.assertIn("app_messages_router_with_read_store", product_api_mod)
        self.assertIn("/app/v3/api/communication/notifications", app_messages)
        self.assertIn("TrustedRequestSubject", app_messages)
        self.assertIn("require_subject", app_messages)
        self.assertIn("AppMessagesReadStore", app_messages)
        self.assertIn("EmptyAppMessagesReadStore", app_messages)
        self.assertIn('PlusApiResult::error("4010"', app_messages)
        self.assertIn("app messages read model is unavailable", app_messages)

        self.assertIn("AppMessagesReadStore", app_api)
        self.assertIn("AppMessagesStore", app_api)
        self.assertIn("SqliteAppMessagesReadStore", app_api)
        self.assertIn("PostgresAppMessagesReadStore", app_api)
        self.assertIn("app_messages_router()", app_api)
        self.assertIn("app_messages_router_with_read_store", app_api)
        self.assertIn("app_request_subject_boundary", app_api)

    def test_console_messages_port_exposes_only_safe_frontend_fields(self) -> None:
        ports_mod = (
            ROOT / "services" / "sdkwork-clawrouter-router-service" / "src" / "ports" / "mod.rs"
        ).read_text(encoding="utf-8")
        port_path = (
            ROOT
            / "services"
            / "sdkwork-clawrouter-router-service"
            / "src"
            / "ports"
            / "app_messages_read_store.rs"
        )

        self.assertTrue(port_path.exists())
        port = port_path.read_text(encoding="utf-8")

        self.assertIn("mod app_messages_read_store;", ports_mod)
        for export_name in [
            "AppMessageItem",
            "AppMessageItems",
            "AppMessagesReadFuture",
            "AppMessagesReadStore",
            "AppMessagesSubject",
        ]:
            self.assertIn(export_name, ports_mod)
            self.assertIn(export_name, port)

        for field_name in ["id", "title", "desc", "content", "time", "message_type", "read"]:
            self.assertIn(field_name, port)

        self.assertIn("pub id: String,", port)
        self.assertIn('#[serde(rename = "type")]', port)
        self.assertIn("#[serde(rename_all = \"camelCase\")]", port)
        for sensitive_field in [
            "metadata",
            "failure_code",
            "retry_count",
            "action_url",
            "target_owner_id",
            "target_owner_type",
        ]:
            self.assertNotIn(sensitive_field, port)
        self.assertNotIn("mock", port.lower())

    def test_console_messages_sql_read_stores_use_real_tables_scope_and_safe_columns(self) -> None:
        for relative, store_name in [
            (
                "services/sdkwork-clawrouter-router-service/src/infrastructure/sql/sqlite/app_messages_read_store.rs",
                "SqliteAppMessagesReadStore",
            ),
            (
                "services/sdkwork-clawrouter-router-service/src/infrastructure/sql/postgres/app_messages_read_store.rs",
                "PostgresAppMessagesReadStore",
            ),
        ]:
            store_path = ROOT / relative
            self.assertTrue(store_path.exists())
            store = store_path.read_text(encoding="utf-8")

            self.assertIn(store_name, store)
            for table in ["ops_notification_message", "ops_notification_delivery"]:
                self.assertIn(table, store)

            for scope_column in ["tenant_id", "organization_id", "user_id"]:
                self.assertIn(scope_column, store)

            for safe_column in [
                "message_type",
                "title",
                "summary",
                "content",
                "published_at",
                "expire_at",
                "target_scope",
                "target_user_id",
                "delivery_status",
                "read_at",
                "delivered_at",
            ]:
                self.assertIn(safe_column, store)

            self.assertIn("load_messages", store)
            self.assertIn("CAST(m.id AS TEXT) AS id", store)
            self.assertIn("message_type_label", store)
            self.assertIn("message_read_status", store)
            self.assertIn("LIMIT", store)
            self.assertIn("SELECT", store)
            self.assertNotIn("SELECT *", store)
            for sensitive_column in [
                "metadata",
                "failure_code",
                "retry_count",
                "action_url",
                "target_owner_id",
                "target_owner_type",
            ]:
                self.assertNotIn(sensitive_column, store)

    def test_console_messages_read_models_reject_invalid_delivery_status_when_delivery_exists(
        self,
    ) -> None:
        for relative in [
            "services/sdkwork-clawrouter-router-service/src/infrastructure/sql/sqlite/app_messages_read_store.rs",
            "services/sdkwork-clawrouter-router-service/src/infrastructure/sql/postgres/app_messages_read_store.rs",
        ]:
            store = (ROOT / relative).read_text(encoding="utf-8")
            compact_store = " ".join(store.split())
            with self.subTest(store=relative):
                self.assertNotIn("COALESCE(d.delivery_status, 0) AS delivery_status", store)
                self.assertIn("d.id AS delivery_id", store)
                self.assertIn("d.delivery_status AS delivery_status", store)
                self.assertNotIn(
                    'let delivery_status = integer_cell(&row, "delivery_status");',
                    compact_store,
                )
                self.assertIn("rows.into_iter().map(row_to_message).collect()", compact_store)
                self.assertIn(
                    'related_integer_cell(&row, "delivery_status", delivery_required)?',
                    compact_store,
                )
                self.assertIn("missing app message delivery_status from database row", store)
                self.assertIn("invalid app message delivery_status from database row", store)

    def test_console_messages_read_models_fail_closed_for_message_type_and_severity(self) -> None:
        for relative in [
            "services/sdkwork-clawrouter-router-service/src/infrastructure/sql/sqlite/app_messages_read_store.rs",
            "services/sdkwork-clawrouter-router-service/src/infrastructure/sql/postgres/app_messages_read_store.rs",
        ]:
            store = (ROOT / relative).read_text(encoding="utf-8")
            compact_store = " ".join(store.split())
            with self.subTest(store=relative):
                self.assertNotIn("COALESCE(m.message_type, 1) AS message_type", store)
                self.assertNotIn("COALESCE(m.severity, 1) AS severity", store)
                self.assertIn("m.message_type AS message_type", store)
                self.assertIn("m.severity AS severity", store)
                self.assertNotIn(
                    'message_type: message_type_label(integer_cell(&row, "message_type")',
                    compact_store,
                )
                self.assertNotIn(
                    'validate_message_severity(integer_cell(&row, "severity"))',
                    compact_store,
                )
                self.assertIn(
                    'message_type_label(required_integer_cell(&row, "message_type")?)?',
                    compact_store,
                )
                self.assertIn('let severity = required_integer_cell(&row, "severity")?;', store)
                self.assertIn("validate_message_severity(severity)?;", store)
                self.assertIn("message_type_for_display(message_type, severity)?", store)
                self.assertIn("fn message_type_label(message_type: i64) -> DomainResult<String>", store)
                self.assertIn("fn validate_message_severity(severity: i64) -> DomainResult<()>", store)
                self.assertIn("fn message_type_for_display(message_type: String, severity: i64) -> DomainResult<String>", store)
                self.assertIn("missing app message message_type from database row", store)
                self.assertIn("missing app message severity from database row", store)
                self.assertIn("invalid app message message_type from database row", store)
                self.assertIn("invalid app message severity from database row", store)
                self.assertNotIn("_ if severity >=", store)
                self.assertNotIn("_ if severity ==", store)

    def test_console_messages_contract_response_schema_is_precise(self) -> None:
        contract = (
            ROOT / "docs" / "schema-registry" / "frontend-field-contracts.yaml"
        ).read_text(encoding="utf-8")
        operation_marker = "api_path: /app/v3/api/communication/notifications"
        operation_index = contract.index(operation_marker)
        schema_index = contract.index("name: MessagesResponse", operation_index)
        self.assertLess(schema_index - operation_index, 1200)

        for marker in [
            "name: Message",
            "items:",
            "required: [id, title, desc, content, time, type, read]",
            "id: { type: string }",
            "enum: [info, billing, warning, alert]",
            "description: User-facing short notification summary.",
        ]:
            self.assertIn(marker, contract[schema_index : schema_index + 2400])

    def test_console_messages_generated_sdk_and_frontend_use_precise_message_type(self) -> None:
        openapi = (
            ROOT / "generated" / "openapi" / "clawrouter-app-openapi.json"
        ).read_text(encoding="utf-8")
        sdk_communication = (
            ROOT / "sdks" / "clawrouter-app-sdk" / "clawrouter-app-sdk-typescript" / "src" / "api" / "communication.ts"
        ).read_text(encoding="utf-8")
        messages_response_path = (
            ROOT
            / "sdks"
            / "clawrouter-app-sdk"
            / "clawrouter-app-sdk-typescript"
            / "src"
            / "types"
            / "messages-response.ts"
        )
        message_path = ROOT / "sdks" / "clawrouter-app-sdk" / "clawrouter-app-sdk-typescript" / "src" / "types" / "message.ts"
        compatibility_service = (
            ROOT
            / "apps"
            / "sdkwork-clawrouter-pc"
            / "packages"
            / "sdkwork-clawrouter-pc-console-messages"
            / "src"
            / "messagesService.ts"
        ).read_text(encoding="utf-8")
        notification_service = (
            ROOT
            / "apps"
            / "sdkwork-clawrouter-pc"
            / "packages"
            / "sdkwork-clawroutes-pc-commons"
            / "src"
            / "notificationService.ts"
        ).read_text(encoding="utf-8")

        self.assertIn('"Message"', openapi)
        self.assertIn('"$ref": "#/components/schemas/Message"', openapi)
        self.assertTrue(messages_response_path.exists())
        self.assertTrue(message_path.exists())

        messages_response = messages_response_path.read_text(encoding="utf-8")
        message = message_path.read_text(encoding="utf-8")
        self.assertIn("import type { Message } from './message';", messages_response)
        self.assertIn("items: Message[];", messages_response)
        self.assertIn("export interface Message", message)
        self.assertIn("id: string;", message)
        self.assertIn("type: 'info' | 'billing' | 'warning' | 'alert';", message)
        self.assertIn("read: boolean;", message)
        self.assertIn(
            "async list(): Promise<NotificationsListResult>",
            sdk_communication,
        )
        self.assertIn("appApiPath(`/communication/notifications`)", sdk_communication)
        self.assertIn(
            "getClawRouterAppSdkClient().communication.notifications.list()",
            notification_service,
        )
        self.assertIn("Message as SdkMessage", notification_service)
        self.assertIn("export interface NotificationItem", notification_service)
        self.assertIn("id: SdkMessage['id'];", notification_service)
        self.assertIn("type: SdkMessage['type'];", notification_service)
        self.assertIn("Promise<NotificationItem[]>", notification_service)
        self.assertIn("NotificationService.fetchNotifications()", compatibility_service)
        self.assertNotIn("normalizeMessage", compatibility_service)
        self.assertNotIn("normalizeMessage", notification_service)


if __name__ == "__main__":
    unittest.main()
