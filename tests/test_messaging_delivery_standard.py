from __future__ import annotations

import unittest
from pathlib import Path
from typing import Any

import yaml

from tools.api_contract_manifest import ApiContractManifestGenerator
from tools.frontend_contract_loader import load_frontend_field_contract
from tools.schema_registry_loader import load_schema_registry


ROOT = Path(__file__).resolve().parents[1]


class MessagingDeliveryStandardTest(unittest.TestCase):
    def load_registry(self) -> dict[str, Any]:
        registry = ROOT / "docs" / "schema-registry" / "sdkwork-clawrouter.tables.yaml"
        data = load_schema_registry(registry)
        self.assertIsInstance(data, dict)
        return data

    def table_map(self) -> dict[str, dict[str, Any]]:
        data = self.load_registry()
        tables = data.get("tables")
        self.assertIsInstance(tables, list)
        return {
            table["table"]: table
            for table in tables
            if isinstance(table, dict) and isinstance(table.get("table"), str)
        }

    def test_external_sms_email_delivery_uses_messaging_tables_not_notification(self) -> None:
        tables = self.table_map()
        required_tables = {
            "messaging_provider_capability",
            "messaging_sender_identity",
            "messaging_template",
            "messaging_template_version",
            "messaging_template_variant",
            "messaging_template_binding",
            "messaging_route_rule",
            "messaging_route_rule_target",
            "messaging_send_request",
            "messaging_send_attempt",
            "messaging_delivery_event",
            "messaging_suppression",
            "messaging_rate_limit_bucket",
        }

        self.assertTrue(required_tables.issubset(set(tables)), required_tables - set(tables))
        for table_name in required_tables:
            table = tables[table_name]
            self.assertEqual("messaging", table.get("domain"), table_name)
            self.assertEqual("sdkwork-appbase-messaging", table.get("write_owner"), table_name)
            self.assertIn("backend", table.get("api_surfaces", []), table_name)

        confusing_tables = [
            name
            for name, table in tables.items()
            if name.startswith("notification_") or (
                table.get("domain") == "notification"
                and any(token in name for token in ("template", "send", "provider", "route"))
            )
        ]
        self.assertEqual([], confusing_tables)

        self.assertIn("delivery_purpose", tables["messaging_template"].get("columns", {}))
        self.assertIn("delivery_purpose", tables["messaging_route_rule"].get("columns", {}))
        self.assertIn("delivery_purpose", tables["messaging_send_request"].get("columns", {}))

    def test_verification_tables_are_iam_challenges_that_reference_messaging_delivery(self) -> None:
        tables = self.table_map()
        for table_name in {
            "iam_verification_scene_policy",
            "iam_verification_challenge",
            "iam_verification_attempt",
        }:
            self.assertIn(table_name, tables)
            self.assertEqual("iam", tables[table_name].get("domain"))

        challenge_columns = tables["iam_verification_challenge"].get("columns", {})
        self.assertIn("delivery_request_id", challenge_columns)
        self.assertIn("code_hash", challenge_columns)
        self.assertNotIn("code_plaintext", challenge_columns)

    def test_messaging_backend_contract_uses_messaging_sdk_domain(self) -> None:
        contract = load_frontend_field_contract(ROOT)
        operations = [
            operation
            for operation in contract.get("frontend_operations", [])
            if isinstance(operation, dict)
            and isinstance(operation.get("api_path"), str)
            and operation["api_path"].startswith("/backend/v3/api/messaging/")
        ]
        self.assertGreaterEqual(len(operations), 10)
        for operation in operations:
            self.assertEqual("backend", operation.get("api_surface"), operation.get("operation"))
            self.assertEqual("messaging", operation.get("sdk_domain"), operation.get("operation"))
            self.assertTrue(str(operation.get("route", "")).startswith("/admin/messaging"))

        manifest = ApiContractManifestGenerator(root=ROOT).generate()
        manifest_operations = [
            operation
            for operation in manifest["operations"]
            if operation["api_path"].startswith("/backend/v3/api/messaging/")
        ]
        self.assertEqual(len(operations), len(manifest_operations))
        for operation in manifest_operations:
            self.assertEqual("messaging", operation["tag"], operation["operation_id"])
            self.assertEqual("messaging", operation["sdk_domain"], operation["operation_id"])
        self.assertIn(
            "templateSends.create",
            {operation["operation_id"] for operation in manifest_operations},
        )
        send_requests = next(
            operation for operation in operations if operation.get("operation_id") == "sendRequests.list"
        )
        item_properties = (
            send_requests.get("response_schema", {})
            .get("properties", {})
            .get("items", {})
            .get("items", {})
            .get("properties", {})
        )
        self.assertIn("deliveryStatus", item_properties)

    def test_messaging_admin_surface_has_complete_sdk_backed_routes(self) -> None:
        contract = load_frontend_field_contract(ROOT)
        operations = {
            operation.get("operation")
            for operation in contract.get("frontend_operations", [])
            if isinstance(operation, dict)
            and str(operation.get("source", "")).endswith(
                "packages/sdkwork-clawrouter-pc-admin-messaging/src/messagingService.ts"
            )
        }
        self.assertTrue(
            {
                "listMessagingProviderAccounts",
                "createMessagingProviderAccount",
                "listMessagingSenderIdentities",
                "createMessagingSenderIdentity",
                "listMessagingTemplates",
                "createMessagingTemplate",
                "publishMessagingTemplateVersion",
                "listMessagingRouteRules",
                "createMessagingRouteRule",
                "listMessagingSendRequests",
                "simulateMessagingRoute",
                "testMessagingSend",
                "sendMessagingTemplate",
                "listMessagingSuppressions",
                "createMessagingSuppression",
                "listMessagingRateLimitBuckets",
                "listVerificationPolicies",
                "updateVerificationPolicy",
            }.issubset(operations),
            operations,
        )

        app_tsx = (ROOT / "apps" / "sdkwork-clawrouter-pc" / "src" / "App.tsx").read_text(
            encoding="utf-8"
        )
        self.assertIn("sdkwork-clawrouter-pc-admin-messaging", app_tsx)
        for route in [
            'path="messaging"',
            'path="messaging/providers"',
            'path="messaging/sender-identities"',
            'path="messaging/templates"',
            'path="messaging/route-rules"',
            'path="messaging/send-requests"',
            'path="messaging/diagnostics"',
            'path="messaging/suppressions"',
            'path="messaging/rate-limits"',
            'path="messaging/verification-policies"',
        ]:
            self.assertIn(route, app_tsx)

        service_path = (
            ROOT
            / "apps"
            / "sdkwork-clawrouter-pc"
            / "packages"
            / "sdkwork-clawrouter-pc-admin-messaging"
            / "src"
            / "messagingService.ts"
        )
        self.assertTrue(service_path.exists())
        service_source = service_path.read_text(encoding="utf-8")
        self.assertIn("getClawRouterBackendSdkClient().messaging", service_source)
        self.assertIn(".messaging.templateSends.create", service_source)
        self.assertIn(".messaging.suppressions.create", service_source)
        self.assertNotIn("fetch(", service_source)
        self.assertNotIn("axios", service_source)

        admin_source = (
            ROOT
            / "apps"
            / "sdkwork-clawrouter-pc"
            / "packages"
            / "sdkwork-clawrouter-pc-admin-messaging"
            / "src"
            / "index.tsx"
        ).read_text(encoding="utf-8")
        for sdk_function in [
            "createMessagingProviderAccount",
            "createMessagingSenderIdentity",
            "createMessagingTemplate",
            "publishMessagingTemplateVersion",
            "createMessagingRouteRule",
            "simulateMessagingRoute",
            "testMessagingSend",
            "createMessagingSuppression",
            "updateVerificationPolicy",
        ]:
            self.assertIn(sdk_function, admin_source)
        for dialog_marker in [
            'data-admin-messaging-provider-account="dialog"',
            'data-admin-messaging-sender-identity="dialog"',
            'data-admin-messaging-template="dialog"',
            'data-admin-messaging-template-publish="dialog"',
            'data-admin-messaging-route-rule="dialog"',
            'data-admin-messaging-route-simulation="dialog"',
            'data-admin-messaging-test-send="dialog"',
            'data-admin-messaging-suppression="dialog"',
            'data-admin-messaging-verification-policy="dialog"',
        ]:
            self.assertIn(dialog_marker, admin_source)
        self.assertIn("sendMessagingTemplate", admin_source)
        self.assertIn('data-admin-messaging-template-send="dialog"', admin_source)
        self.assertIn("deliveryPurpose", admin_source)
        self.assertIn("marketing", admin_source)
        self.assertIn("Email sender identity requires From Email.", admin_source)
        self.assertIn("SMS sender identity requires Sign Name or Sender ID.", admin_source)
        self.assertIn("form.channel === 'sms' ? 'text' : form.contentFormat", admin_source)

    def test_appbase_declares_messaging_as_first_class_l3_capability(self) -> None:
        catalog_path = ROOT.parent / "sdkwork-appbase" / "specs" / "appbase-capabilities.yaml"
        catalog = yaml.safe_load(catalog_path.read_text(encoding="utf-8"))
        capabilities = {
            item.get("id"): item
            for item in catalog.get("capabilities", [])
            if isinstance(item, dict)
        }
        messaging = capabilities.get("messaging")
        self.assertIsNotNone(messaging)
        self.assertEqual("messaging", messaging.get("domain"))
        self.assertEqual("L3", messaging.get("targetMaturity"))
        self.assertIn("sms", messaging.get("scope", []))
        self.assertIn("email", messaging.get("scope", []))

    def test_product_app_runtime_does_not_wire_local_verification_delivery(self) -> None:
        app_api_path = ROOT / "crates" / "sdkwork-routes-clawrouter-app-api" / "src" / "routes.rs"
        iam_runtime_path = ROOT / "crates" / "sdkwork-routes-clawrouter-app-api" / "src" / "iam_runtime.rs"
        app_api_source = app_api_path.read_text(encoding="utf-8")
        iam_runtime_source = iam_runtime_path.read_text(encoding="utf-8")

        self.assertNotIn("VerificationDeliveryQueueSender", app_api_source)
        self.assertNotIn("verification_code_sender", app_api_source)
        self.assertNotIn("app_auth_router", app_api_source)
        self.assertIn("merge_federated_iam_routers", app_api_source)
        self.assertIn("bootstrap_iam_database_from_env", iam_runtime_source)
        self.assertIn("wire_iam_routers", iam_runtime_source)


if __name__ == "__main__":
    unittest.main()
