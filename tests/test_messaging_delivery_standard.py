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

    def test_clawrouter_schema_registry_does_not_own_messaging_delivery_tables(self) -> None:
        tables = self.table_map()
        messaging_tables = [name for name in tables if name.startswith("messaging_")]
        self.assertEqual(
            [],
            messaging_tables,
            "messaging delivery tables are owned by sdkwork-appbase-messaging, not claw-router",
        )

        confusing_tables = [
            name
            for name, table in tables.items()
            if name.startswith("notification_") or (
                table.get("domain") == "notification"
                and any(token in name for token in ("template", "send", "provider", "route"))
            )
        ]
        self.assertEqual([], confusing_tables)

    def test_clawrouter_schema_registry_does_not_own_iam_verification_tables(self) -> None:
        tables = self.table_map()
        verification_tables = [
            name
            for name in tables
            if name.startswith("iam_verification_")
        ]
        self.assertEqual(
            [],
            verification_tables,
            "IAM verification tables are owned by sdkwork-iam, not claw-router",
        )

    def test_messaging_backend_contract_uses_messaging_sdk_domain(self) -> None:
        contract = load_frontend_field_contract(ROOT)
        operations = [
            operation
            for operation in contract.get("frontend_operations", [])
            if isinstance(operation, dict)
            and isinstance(operation.get("api_path"), str)
            and operation["api_path"].startswith("/backend/v3/api/messaging/")
        ]
        self.assertEqual(
            [],
            operations,
            "relay-only Claw Router must not declare messaging admin frontend operations",
        )

        manifest = ApiContractManifestGenerator(root=ROOT).generate()
        manifest_operations = [
            operation
            for operation in manifest["operations"]
            if operation["api_path"].startswith("/backend/v3/api/messaging/")
            and str(operation.get("source", "")).startswith("apps/sdkwork-clawrouter-pc/")
        ]
        self.assertEqual([], manifest_operations)

    def test_messaging_admin_surface_is_external_to_relay_portal(self) -> None:
        contract = load_frontend_field_contract(ROOT)
        clawrouter_messaging_sources = [
            operation
            for operation in contract.get("frontend_operations", [])
            if isinstance(operation, dict)
            and "sdkwork-clawrouter-pc-admin-messaging" in str(operation.get("source", ""))
        ]
        self.assertEqual([], clawrouter_messaging_sources)

        app_tsx = (ROOT / "apps" / "sdkwork-clawrouter-pc" / "src" / "App.tsx").read_text(
            encoding="utf-8"
        )
        self.assertNotIn("sdkwork-clawrouter-pc-admin-messaging", app_tsx)
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
            self.assertNotIn(route, app_tsx)

        service_path = (
            ROOT
            / "apps"
            / "sdkwork-clawrouter-pc"
            / "packages"
            / "sdkwork-clawrouter-pc-admin-messaging"
            / "src"
            / "messagingService.ts"
        )
        self.assertFalse(service_path.exists())

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
        iam_embedded_path = (
            ROOT / "crates" / "sdkwork-clawrouter-edge-runtime" / "src" / "iam_embedded.rs"
        )
        app_api_source = app_api_path.read_text(encoding="utf-8")
        iam_embedded_source = iam_embedded_path.read_text(encoding="utf-8")

        self.assertNotIn("VerificationDeliveryQueueSender", app_api_source)
        self.assertNotIn("verification_code_sender", app_api_source)
        self.assertNotIn("app_auth_router", app_api_source)
        self.assertNotIn("merge_federated_iam_routers", app_api_source)
        self.assertIn("bootstrap_iam_database_from_env", iam_embedded_source)
        self.assertIn("build_claw_embedded_iam_app_api_router", iam_embedded_source)


if __name__ == "__main__":
    unittest.main()
