import json
import subprocess
import sys
import tempfile
import textwrap
import unittest
from pathlib import Path

from tests.test_commerce_standard import CANONICAL_COMMERCE_API_OPERATIONS, MIGRATED_COMMERCE_PRODUCT_CENTER_API_OPERATIONS
from tools.appbase_integration_guardian import AppbaseIntegrationGuardian


REPO_ROOT = Path(__file__).resolve().parents[1]

COMMERCE_FRONTEND_DEPENDENCIES = [
    "@sdkwork/clawrouter-app-sdk",
    "@sdkwork/clawrouter-backend-sdk",
    "sdkwork-clawroutes-pc-commons",
    "sdkwork-clawrouter-pc-admin-catalog",
    "sdkwork-clawrouter-pc-admin-inventory",
    "sdkwork-clawrouter-pc-admin-orders",
    "sdkwork-clawrouter-pc-admin-payments",
    "sdkwork-clawrouter-pc-admin-memberships",
    "sdkwork-clawrouter-pc-admin-wallet",
    "sdkwork-clawrouter-pc-admin-finance",
    "@sdkwork/commerce-pc-host",
    "@sdkwork/commerce-pc-wallet",
    "@sdkwork/commerce-pc-membership",
    "@sdkwork/commerce-pc-membership-purchase",
    "@sdkwork/commerce-pc-billing",
    "@sdkwork/commerce-pc-checkout",
    "@sdkwork/commerce-pc-payment",
]

COMMERCE_CONSOLE_SHELL_ADAPTER = "apps/sdkwork-clawrouter-pc/src/App.tsx"
COMMERCE_CONSOLE_HOST_MOUNT = "apps/sdkwork-clawrouter-pc/src/commerce/commerceHostMount.tsx"

COMMERCE_FRONTEND_SERVICE_ADAPTERS = [
    "apps/sdkwork-clawrouter-pc/packages/sdkwork-clawrouter-pc-admin-catalog/src/catalogService.ts",
    "apps/sdkwork-clawrouter-pc/packages/sdkwork-clawrouter-pc-admin-inventory/src/inventoryService.ts",
    "apps/sdkwork-clawrouter-pc/packages/sdkwork-clawrouter-pc-admin-orders/src/ordersService.ts",
    "apps/sdkwork-clawrouter-pc/packages/sdkwork-clawrouter-pc-admin-payments/src/paymentsService.ts",
    "apps/sdkwork-clawrouter-pc/packages/sdkwork-clawrouter-pc-admin-memberships/src/membershipsService.ts",
    "apps/sdkwork-clawrouter-pc/packages/sdkwork-clawrouter-pc-admin-wallet/src/walletService.ts",
    "apps/sdkwork-clawrouter-pc/packages/sdkwork-clawrouter-pc-admin-finance/src/financeService.ts",
    COMMERCE_CONSOLE_SHELL_ADAPTER,
    COMMERCE_CONSOLE_HOST_MOUNT,
]


def retired_appbase_sdk_clients_module() -> str:
    return "-".join(["appbase", "sdk", "clients"])


def retired_appbase_sdk_clients_path() -> str:
    return "/".join(
        [
            "apps",
            "sdkwork-clawrouter-pc",
            "packages",
            "sdkwork-clawroutes-pc-commons",
            "src",
            f"{retired_appbase_sdk_clients_module()}.ts",
        ]
    )


class AppbaseIntegrationGuardianTest(unittest.TestCase):
    def write_appbase_catalog(self, root: Path) -> None:
        catalog = (
            root
            / ".sdkwork"
            / "dependencies"
            / "sdkwork-appbase"
            / "specs"
            / "appbase-capabilities.yaml"
        )
        catalog.parent.mkdir(parents=True, exist_ok=True)
        catalog.write_text(
            textwrap.dedent(
                """
                schemaVersion: 1
                kind: sdkwork.appbase.capability.catalog
                capabilities:
                  - id: commerce
                    domain: commerce
                    status: standard
                    maturity: L3
                    targetMaturity: L3
                    priority: P0
                    owner: sdkwork-appbase
                    requiredLayers: []
                    qualityGates: []
                    integration:
                      productForksForbidden: true
                      sdkBoundary: generated-sdk-through-ports
                  - id: notification
                    domain: notification
                    status: planned-standard
                    maturity: L1
                    targetMaturity: L3
                    priority: P0
                    owner: sdkwork-appbase
                    requiredLayers: []
                    qualityGates: []
                    integration:
                      productForksForbidden: true
                      sdkBoundary: generated-sdk-through-ports
                """
            ).strip()
            + "\n",
            encoding="utf-8",
        )

    def write_sibling_appbase_catalog(self, workspace_root: Path) -> None:
        catalog = workspace_root / "sdkwork-appbase" / "specs" / "appbase-capabilities.yaml"
        catalog.parent.mkdir(parents=True, exist_ok=True)
        catalog.write_text(
            textwrap.dedent(
                """
                schemaVersion: 1
                kind: sdkwork.appbase.capability.catalog
                capabilities:
                  - id: commerce
                    domain: commerce
                    status: standard
                    maturity: L3
                    targetMaturity: L3
                    priority: P0
                    owner: sdkwork-appbase
                    requiredLayers: []
                    qualityGates: []
                    integration:
                      productForksForbidden: true
                      sdkBoundary: generated-sdk-through-ports
                """
            ).strip()
            + "\n",
            encoding="utf-8",
        )

    def write_integration_manifest(self, root: Path, content: str) -> None:
        manifest = root / "specs" / "appbase-integration.yaml"
        manifest.parent.mkdir(parents=True, exist_ok=True)
        manifest.write_text(textwrap.dedent(content).strip() + "\n", encoding="utf-8")

    def write_portal_package(self, root: Path, dependencies: dict[str, str]) -> None:
        package = root / "apps" / "sdkwork-clawrouter-pc" / "package.json"
        package.parent.mkdir(parents=True, exist_ok=True)
        package.write_text(
            json.dumps({"dependencies": dependencies}, indent=2) + "\n",
            encoding="utf-8",
        )

    def write_runtime_adapter(self, root: Path, relative_path: str) -> None:
        path = root / relative_path
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text("// adapter\n", encoding="utf-8")

    def write_cargo(self, root: Path, relative_path: str, body: str) -> None:
        path = root / relative_path
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(textwrap.dedent(body).strip() + "\n", encoding="utf-8")

    def valid_integration_manifest(self) -> str:
        dependencies = "\n".join(f'                - "{dependency}"' if dependency.startswith("@") else f"                - {dependency}" for dependency in COMMERCE_FRONTEND_DEPENDENCIES)
        adapters = "\n".join(f"                - {adapter}" for adapter in COMMERCE_FRONTEND_SERVICE_ADAPTERS)
        return f"""
        schemaVersion: 1
        kind: sdkwork.appbase.integration
        app:
          key: sdkwork-clawrouter
        integrations:
          - capability: commerce
            requiredMaturity: L3
            surfaces: [app, backend, portal, installer]
            frontend:
              dependencies:
{dependencies}
              adapters:
{adapters}
              sdkInjectionAdapters: []
            rust:
              crates:
                - name: sdkwork_commerce_http
                  manifest: services/sdkwork-clawrouter-app-api-server/Cargo.toml
                - name: sdkwork_commerce_membership_sqlx
                  manifest: services/sdkwork-clawrouter-app-api-server/Cargo.toml
                - name: sdkwork_commerce_membership_sqlx
                  manifest: services/sdkwork-clawrouter-admin-api-server/Cargo.toml
            contractTests:
              - services/sdkwork-clawrouter-app-api-server/tests/contract_routes.rs
            verification:
              - python -B -m unittest tests.test_commerce_standard
            forbiddenProductForks:
              - services/sdkwork-clawrouter-router-service/src/api/app_vip*.rs
              - services/sdkwork-clawrouter-router-service/src/infrastructure/sql/*/app_vip*.rs
              - services/sdkwork-clawrouter-router-service/src/api/app_checkout.rs
              - services/sdkwork-clawrouter-router-service/src/api/app_recharge.rs
              - services/sdkwork-clawrouter-router-service/src/ports/checkout_store.rs
              - services/sdkwork-clawrouter-router-service/src/ports/recharge_store.rs
              - services/sdkwork-clawrouter-router-service/src/infrastructure/sql/sqlite/checkout_store.rs
              - services/sdkwork-clawrouter-router-service/src/infrastructure/sql/sqlite/recharge_store.rs
              - services/sdkwork-clawrouter-router-service/src/infrastructure/sql/postgres/checkout_store.rs
              - services/sdkwork-clawrouter-router-service/src/infrastructure/sql/postgres/recharge_store.rs
            sdkBoundary: generated-sdk-through-ports
        """

    def standard_commerce_operations_schema(self, extra_operations: str = "") -> str:
        lines = ["frontend_operations:"]
        for surface, method, api_path, operation_id in dict.fromkeys(
            (
                *MIGRATED_COMMERCE_PRODUCT_CENTER_API_OPERATIONS,
                *CANONICAL_COMMERCE_API_OPERATIONS,
            )
        ):
            lines.extend(
                [
                    f"  - api_surface: {surface}",
                    f"    api_method: {method}",
                    f"    api_path: {api_path}",
                    f"    operation_id: {operation_id}",
                ]
            )
        base = "\n".join(lines)
        if not extra_operations.strip():
            return base + "\n"
        return base + "\n" + textwrap.indent(textwrap.dedent(extra_operations).strip(), "  ") + "\n"

    def write_valid_files(self, root: Path) -> None:
        self.write_appbase_catalog(root)
        self.write_integration_manifest(root, self.valid_integration_manifest())
        self.write_portal_package(
            root,
            {dependency: "workspace:*" for dependency in COMMERCE_FRONTEND_DEPENDENCIES},
        )
        for adapter in COMMERCE_FRONTEND_SERVICE_ADAPTERS:
            self.write_runtime_adapter(root, adapter)
        self.write_cargo(
            root,
            "services/sdkwork-clawrouter-app-api-server/Cargo.toml",
            """
            [dependencies]
            sdkwork_commerce_http = { path = "../../sdkwork-appbase/packages/native-rust/commerce/sdkwork-commerce-http-rust" }
            sdkwork_commerce_membership_sqlx = { path = "../../sdkwork-appbase/packages/native-rust/commerce/sdkwork-commerce-membership-sqlx-rust" }
            """,
        )
        self.write_cargo(
            root,
            "services/sdkwork-clawrouter-admin-api-server/Cargo.toml",
            """
            [dependencies]
            sdkwork_commerce_membership_sqlx = { path = "../../sdkwork-appbase/packages/native-rust/commerce/sdkwork-commerce-membership-sqlx-rust" }
            """,
        )
        self.write_runtime_adapter(root, "services/sdkwork-clawrouter-app-api-server/tests/contract_routes.rs")
        self.write_runtime_adapter(root, "tests/test_commerce_standard.py")

    def write_frontend_contract_index(self, root: Path, content: str) -> Path:
        fragment = root / "docs" / "schema-registry" / "frontend-field-contracts" / "operations" / "commerce.yaml"
        fragment.parent.mkdir(parents=True, exist_ok=True)
        fragment.write_text(textwrap.dedent(content).strip() + "\n", encoding="utf-8")
        index = root / "docs" / "schema-registry" / "frontend-field-contracts" / "index.yaml"
        index.write_text(
            textwrap.dedent(
                """
                schema: sdkwork-clawrouter-frontend-field-contracts
                version: 0.1.0
                source: apps/sdkwork-clawrouter-pc/src/App.tsx
                rule: every actual portal route must be backed by explicit schema tables.
                fragments:
                  - operations/commerce.yaml
                """
            ).strip()
            + "\n",
            encoding="utf-8",
        )
        return index

    def test_accepts_declared_appbase_integration(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            self.write_valid_files(root)

            result = AppbaseIntegrationGuardian(root=root).run()

            self.assertTrue(result.ok, result.messages)

    def test_accepts_sibling_appbase_catalog_without_materialized_dependency_copy(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            workspace_root = Path(tmp)
            root = workspace_root / "sdkwork-clawrouter"
            root.mkdir()
            self.write_sibling_appbase_catalog(workspace_root)
            self.write_integration_manifest(root, self.valid_integration_manifest())
            self.write_portal_package(
                root,
                {dependency: "workspace:*" for dependency in COMMERCE_FRONTEND_DEPENDENCIES},
            )
            for adapter in COMMERCE_FRONTEND_SERVICE_ADAPTERS:
                self.write_runtime_adapter(root, adapter)
            self.write_cargo(
                root,
                "services/sdkwork-clawrouter-app-api-server/Cargo.toml",
                """
                [dependencies]
                sdkwork_commerce_http = { workspace = true }
                sdkwork_commerce_membership_sqlx = { workspace = true }
                """,
            )
            self.write_cargo(
                root,
                "services/sdkwork-clawrouter-admin-api-server/Cargo.toml",
                """
                [dependencies]
                sdkwork_commerce_membership_sqlx = { workspace = true }
                """,
            )
            self.write_runtime_adapter(root, "services/sdkwork-clawrouter-app-api-server/tests/contract_routes.rs")
            self.write_runtime_adapter(root, "tests/test_commerce_standard.py")

            result = AppbaseIntegrationGuardian(root=root).run()

            self.assertTrue(result.ok, result.messages)

    def test_skips_commerce_schema_registry_when_commerce_is_not_appbase_integrated(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            self.write_appbase_catalog(root)
            self.write_integration_manifest(
                root,
                """
                schemaVersion: 1
                kind: sdkwork.appbase.integration
                app:
                  key: sdkwork-clawrouter
                integrations:
                  - capability: notification
                    requiredMaturity: L1
                    surfaces: [portal]
                    verification:
                      - python -B -m unittest tests.test_notification_runtime_standard
                    forbiddenProductForks: []
                    sdkBoundary: generated-sdk-through-ports
                """,
            )
            self.write_runtime_adapter(root, "tests/test_notification_runtime_standard.py")
            schema = root / "docs" / "schema-registry" / "frontend-field-contracts.yaml"
            schema.parent.mkdir(parents=True, exist_ok=True)
            schema.write_text(
                textwrap.dedent(
                    """
                    frontend_operations:
                      - api_surface: backend
                        api_method: GET
                        api_path: /backend/v3/api/catalog/products
                        operation_id: backend.catalog.products.list
                    """
                ).strip()
                + "\n",
                encoding="utf-8",
            )

            result = AppbaseIntegrationGuardian(root=root).run()

            self.assertTrue(result.ok, result.messages)

    def test_rejects_unknown_and_immature_capability(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            self.write_valid_files(root)
            self.write_integration_manifest(
                root,
                """
                schemaVersion: 1
                kind: sdkwork.appbase.integration
                app:
                  key: sdkwork-clawrouter
                integrations:
                  - capability: notification
                    requiredMaturity: L3
                    surfaces: [portal]
                    sdkBoundary: generated-sdk-through-ports
                  - capability: missing-foundation
                    requiredMaturity: L1
                    surfaces: [portal]
                    sdkBoundary: generated-sdk-through-ports
                """,
            )

            result = AppbaseIntegrationGuardian(root=root).run()

            self.assertFalse(result.ok)
            self.assertIn(
                "appbase integration notification requires maturity L3 but appbase catalog declares L1",
                result.messages,
            )
            self.assertIn(
                "appbase integration references unknown capability: missing-foundation",
                result.messages,
            )

    def test_rejects_missing_frontend_dependency_and_product_fork(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            self.write_valid_files(root)
            self.write_portal_package(root, {"@sdkwork/clawrouter-app-sdk": "workspace:*"})
            product_fork = root / "services" / "sdkwork-clawrouter-router-service" / "src" / "api" / "app_vip.rs"
            product_fork.parent.mkdir(parents=True, exist_ok=True)
            product_fork.write_text("// product fork\n", encoding="utf-8")

            result = AppbaseIntegrationGuardian(root=root).run()

            self.assertFalse(result.ok)
            self.assertIn(
                "appbase integration commerce missing portal dependency @sdkwork/clawrouter-backend-sdk",
                result.messages,
            )
            self.assertIn(
                "appbase integration commerce forbids product fork path matching services/sdkwork-clawrouter-router-service/src/api/app_vip*.rs: services/sdkwork-clawrouter-router-service/src/api/app_vip.rs",
                result.messages,
            )

    def test_rejects_retired_appbase_sdk_client_fork_without_manifest_entry(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            self.write_valid_files(root)
            retired_fork = root / retired_appbase_sdk_clients_path()
            retired_fork.parent.mkdir(parents=True, exist_ok=True)
            retired_fork.write_text("// retired product fork\n", encoding="utf-8")

            result = AppbaseIntegrationGuardian(root=root).run()

            self.assertFalse(result.ok)
            self.assertIn(
                f"appbase integration forbids product fork path that exists: {retired_appbase_sdk_clients_path()}",
                result.messages,
            )

    def test_rejects_root_level_appbase_commerce_shadow_packages(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            self.write_valid_files(root)
            for shadow_root in [
                root / "packages" / "common" / "commerce" / "sdkwork-commerce-service",
                root / "packages" / "native-rust" / "commerce" / "sdkwork-commerce-storage-sqlx-rust",
            ]:
                shadow_root.mkdir(parents=True, exist_ok=True)
                shadow_root.joinpath("README.md").write_text("shadow appbase fork\n", encoding="utf-8")

            result = AppbaseIntegrationGuardian(root=root).run()

            self.assertFalse(result.ok)
            self.assertIn(
                "appbase integration forbids root-level appbase commerce shadow path that exists: packages/common/commerce",
                result.messages,
            )
            self.assertIn(
                "appbase integration forbids root-level appbase commerce shadow path that exists: packages/native-rust/commerce",
                result.messages,
            )

    def test_rejects_commerce_integration_without_business_service_adapters(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            self.write_valid_files(root)
            self.write_integration_manifest(
                root,
                """
                schemaVersion: 1
                kind: sdkwork.appbase.integration
                app:
                  key: sdkwork-clawrouter
                integrations:
                  - capability: commerce
                    requiredMaturity: L3
                    surfaces: [app, backend, portal, installer]
                    frontend:
                      dependencies:
                        - "@sdkwork/clawrouter-app-sdk"
                        - "@sdkwork/clawrouter-backend-sdk"
                      adapters: []
                      sdkInjectionAdapters: []
                    contractTests:
                      - services/sdkwork-clawrouter-app-api-server/tests/contract_routes.rs
                    verification:
                      - python -B -m unittest tests.test_commerce_standard
                    forbiddenProductForks: []
                    sdkBoundary: generated-sdk-through-ports
                """,
            )

            result = AppbaseIntegrationGuardian(root=root).run()

            self.assertFalse(result.ok)
            self.assertIn(
                "appbase integration commerce must declare required frontend adapter: apps/sdkwork-clawrouter-pc/packages/sdkwork-clawrouter-pc-admin-payments/src/paymentsService.ts",
                result.messages,
            )

    def test_rejects_commerce_billing_standard_verification_target(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            self.write_valid_files(root)
            self.write_runtime_adapter(root, "tests/test_commerce_billing_standard.py")
            self.write_integration_manifest(
                root,
                """
                schemaVersion: 1
                kind: sdkwork.appbase.integration
                app:
                  key: sdkwork-clawrouter
                integrations:
                  - capability: commerce
                    requiredMaturity: L3
                    surfaces: [app, backend, portal]
                    frontend:
                      dependencies:
                        - "@sdkwork/commerce-service"
                        - "@sdkwork/commerce-sdk-ports"
                      adapters:
                        - apps/sdkwork-clawrouter-pc/packages/sdkwork-clawroutes-pc-commons/src/commerce-runtime.ts
                        - apps/sdkwork-clawrouter-pc/packages/sdkwork-clawrouter-pc-admin-payments/src/index.tsx
                      sdkInjectionAdapters:
                        - apps/sdkwork-clawrouter-pc/packages/sdkwork-clawroutes-pc-commons/src/commerce-runtime.ts
                    verification:
                      - python -B -m unittest tests.test_commerce_standard tests.test_commerce_billing_standard
                    forbiddenProductForks: []
                    sdkBoundary: generated-sdk-through-ports
                """,
            )

            result = AppbaseIntegrationGuardian(root=root).run()

            self.assertFalse(result.ok)
            self.assertIn(
                "appbase integration commerce verification command must not reference billing-named test module: tests.test_commerce_billing_standard",
                result.messages,
            )

    def test_rejects_commerce_legacy_paths_namespaces_and_compatibility_modes(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            self.write_valid_files(root)
            self.write_integration_manifest(
                root,
                """
                schemaVersion: 1
                kind: sdkwork.appbase.integration
                app:
                  key: sdkwork-clawrouter
                integrations:
                  - capability: commerce
                    requiredMaturity: L3
                    surfaces: [app, backend, portal]
                    sdkNamespaces: [billing]
                    legacyRoute: /app/v3/api/payments/checkout/order-1
                    compatibilityMode: unwrap-old-envelope
                    notes: compatibility envelopes are not allowed
                    frontend:
                      dependencies:
                        - "@sdkwork/commerce-service"
                        - "@sdkwork/commerce-sdk-ports"
                      adapters:
                        - apps/sdkwork-clawrouter-pc/packages/sdkwork-clawroutes-pc-commons/src/commerce-runtime.ts
                        - apps/sdkwork-clawrouter-pc/packages/sdkwork-clawrouter-pc-admin-payments/src/index.tsx
                      sdkInjectionAdapters:
                        - apps/sdkwork-clawrouter-pc/packages/sdkwork-clawroutes-pc-commons/src/commerce-runtime.ts
                    verification:
                      - python -B -m unittest tests.test_commerce_standard
                    forbiddenProductForks: []
                    sdkBoundary: generated-sdk-through-ports
                """,
            )

            result = AppbaseIntegrationGuardian(root=root).run()

            self.assertFalse(result.ok)
            self.assertIn("appbase integration commerce must not declare SDK namespace billing", result.messages)
            self.assertIn(
                "appbase integration commerce must not reference retired commerce API path: /app/v3/api/payments/checkout/order-1",
                result.messages,
            )
            self.assertIn("appbase integration commerce must not declare compatibilityMode", result.messages)
            self.assertIn(
                "appbase integration commerce must not mention compatibility envelopes",
                result.messages,
            )

    def test_rejects_commerce_schema_registry_legacy_paths_billing_tables_and_surface_prefixed_operation_ids(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            self.write_valid_files(root)
            schema = root / "docs" / "schema-registry" / "frontend-field-contracts.yaml"
            schema.parent.mkdir(parents=True, exist_ok=True)
            schema.write_text(
                textwrap.dedent(
                    """
                    frontend_operations:
                      - api_surface: app
                        api_method: GET
                        api_path: /app/v3/api/billing/account/summary
                        operation_id: account.summary.retrieve
                        read_sources: [commerce_billing_prehold]
                    """
                ).strip()
                + "\n",
                encoding="utf-8",
            )

            result = AppbaseIntegrationGuardian(root=root).run()

            self.assertFalse(result.ok)
            self.assertIn(
                "appbase commerce schema registry must not declare retired commerce API path: /app/v3/api/billing/account/summary",
                result.messages,
            )
            self.assertIn(
                "appbase commerce schema registry must not declare billing table: commerce_billing_prehold",
                result.messages,
            )
            self.assertIn(
                "appbase commerce schema registry must not declare retired commerce operationId: account.summary.retrieve",
                result.messages,
            )

    def test_rejects_modular_commerce_schema_registry_legacy_paths(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            self.write_valid_files(root)
            snapshot = root / "docs" / "schema-registry" / "frontend-field-contracts.yaml"
            snapshot.parent.mkdir(parents=True, exist_ok=True)
            snapshot.write_text("frontend_operations: []\n", encoding="utf-8")
            self.write_frontend_contract_index(
                root,
                """
                frontend_operations:
                  - api_surface: app
                    api_method: GET
                    api_path: /app/v3/api/billing/account/summary
                    operation_id: account.summary.retrieve
                    read_sources: [commerce_billing_prehold]
                """,
            )

            result = AppbaseIntegrationGuardian(root=root).run()

            self.assertFalse(result.ok)
            self.assertIn(
                "appbase commerce schema registry must not declare retired commerce API path: /app/v3/api/billing/account/summary",
                result.messages,
            )
            self.assertIn(
                "appbase commerce schema registry must not declare billing table: commerce_billing_prehold",
                result.messages,
            )

    def test_accepts_standard_commerce_operation_id_roots(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            self.write_valid_files(root)
            schema = root / "docs" / "schema-registry" / "frontend-field-contracts.yaml"
            schema.parent.mkdir(parents=True, exist_ok=True)
            schema.write_text(self.standard_commerce_operations_schema(), encoding="utf-8")

            result = AppbaseIntegrationGuardian(root=root).run()

            self.assertTrue(result.ok, result.messages)

    def test_rejects_retired_scattered_billing_api_paths_and_operation_roots(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            self.write_valid_files(root)
            schema = root / "docs" / "schema-registry" / "frontend-field-contracts.yaml"
            schema.parent.mkdir(parents=True, exist_ok=True)
            schema.write_text(
                self.standard_commerce_operations_schema(
                    """
                      - api_surface: app
                        api_method: GET
                        api_path: /app/v3/api/payments/checkout/{orderNo}
                        operation_id: payments.checkout.retrieve
                      - api_surface: app
                        api_method: GET
                        api_path: /app/v3/api/router/settlements/dashboard
                        operation_id: settlements.dashboard.list
                      - api_surface: backend
                        api_method: GET
                        api_path: /backend/v3/api/commerce/reports/usage_statements
                        operation_id: reports.usageStatements.list
                      - api_surface: backend
                        api_method: GET
                        api_path: /backend/v3/api/wallet/ledger
                        operation_id: wallet.ledger.list
                    """
                ),
                encoding="utf-8",
            )

            result = AppbaseIntegrationGuardian(root=root).run()

            self.assertFalse(result.ok)
            self.assertIn(
                "appbase commerce schema registry must not declare retired commerce API path: /app/v3/api/payments/checkout/{orderNo}",
                result.messages,
            )
            self.assertIn(
                "appbase commerce schema registry must not declare retired commerce API path: /app/v3/api/router/settlements/dashboard",
                result.messages,
            )
            self.assertIn(
                "appbase commerce schema registry must not declare retired commerce API path: /backend/v3/api/commerce/reports/usage_statements",
                result.messages,
            )
            self.assertIn(
                "appbase commerce schema registry must not declare retired commerce API path: /backend/v3/api/wallet/ledger",
                result.messages,
            )
            self.assertIn(
                "appbase commerce schema registry must not declare retired commerce operationId: wallet.ledger.list",
                result.messages,
            )

    def test_rejects_commerce_schema_registry_without_product_center_api_contracts(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            self.write_valid_files(root)
            schema = root / "docs" / "schema-registry" / "frontend-field-contracts.yaml"
            schema.parent.mkdir(parents=True, exist_ok=True)
            schema.write_text("frontend_operations: []\n", encoding="utf-8")

            result = AppbaseIntegrationGuardian(root=root).run()

            self.assertFalse(result.ok)
            self.assertIn(
                "appbase commerce schema registry must declare standard commerce API operation: "
                "GET /app/v3/api/catalog/products catalog.products.list",
                result.messages,
            )
            self.assertIn(
                "appbase commerce schema registry must declare standard commerce API operation: "
                "PATCH /backend/v3/api/catalog/skus/{skuId} catalog.skus.update",
                result.messages,
            )
            self.assertIn(
                "appbase commerce schema registry must declare standard commerce API operation: "
                "GET /backend/v3/api/inventory/stocks inventory.stocks.list",
                result.messages,
            )

    def test_rejects_legacy_console_billing_route_classification(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            self.write_valid_files(root)
            registry = root / "docs" / "schema-registry" / "frontend-route-classification.yaml"
            registry.parent.mkdir(parents=True, exist_ok=True)
            registry.write_text(
                textwrap.dedent(
                    f"""
                    routes:
                      - route: {'/console/' + 'billing'}
                        package: sdkwork-clawrouter-pc-console-commerce
                        operation_routes: [{'/console/' + 'billing'}]
                    """
                ).strip()
                + "\n",
                encoding="utf-8",
            )

            result = AppbaseIntegrationGuardian(root=root).run()

            self.assertFalse(result.ok)
            self.assertIn(
                "appbase commerce route classification must use business-domain routes instead of retired aggregate commerce or billing routes",
                result.messages,
            )

    def test_rejects_commerce_table_registry_without_unified_product_center_tables(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            self.write_valid_files(root)
            registry = root / "docs" / "schema-registry" / "sdkwork-clawrouter.tables.yaml"
            registry.parent.mkdir(parents=True, exist_ok=True)
            registry.write_text(
                textwrap.dedent(
                    """
                    - table: commerce_product
                      domain: commerce
                    - table: commerce_sku
                      domain: commerce
                    """
                ).strip()
                + "\n",
                encoding="utf-8",
            )

            result = AppbaseIntegrationGuardian(root=root).run()

            self.assertFalse(result.ok)
            self.assertIn(
                "appbase commerce table registry must not declare retired product center table: commerce_product",
                result.messages,
            )
            self.assertIn(
                "appbase commerce table registry must not declare retired product center table: commerce_sku",
                result.messages,
            )
            self.assertIn(
                "appbase commerce table registry must declare unified product center table: commerce_product_spu",
                result.messages,
            )
            self.assertIn(
                "appbase commerce table registry must declare unified product center table: commerce_product_sku",
                result.messages,
            )

    def test_rejects_commerce_feature_view_that_imports_clawrouter_generated_sdk(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            self.write_valid_files(root)
            self.write_runtime_adapter(
                root,
                "apps/sdkwork-clawrouter-pc/packages/sdkwork-clawrouter-pc-admin-payments/src/index.tsx",
            )
            (
                root
                / "apps"
                / "sdkwork-clawrouter-pc"
                / "packages"
                / "sdkwork-clawrouter-pc-admin-payments"
                / "src"
                / "index.tsx"
            ).write_text(
                "import type { BillingVipLevelsListParams } from '@sdkwork/clawrouter-backend-sdk';\n",
                encoding="utf-8",
            )

            result = AppbaseIntegrationGuardian(root=root).run()

            self.assertFalse(result.ok)
            self.assertIn(
                "appbase integration commerce frontend source apps/sdkwork-clawrouter-pc/packages/sdkwork-clawrouter-pc-admin-payments/src/index.tsx must not import ClawRouter generated SDK packages; use the local commerce service boundary",
                result.messages,
            )

    def test_rejects_commerce_feature_source_that_imports_clawrouter_generated_sdk(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            self.write_valid_files(root)
            feature_file = (
                root
                / "apps"
                / "sdkwork-clawrouter-pc"
                / "packages"
                / "sdkwork-clawrouter-pc-admin-payments"
                / "src"
                / "nested"
                / "directSdk.ts"
            )
            feature_file.parent.mkdir(parents=True, exist_ok=True)
            feature_file.write_text(
                "import { SdkworkBackendClient } from '@sdkwork/clawrouter-backend-sdk';\n",
                encoding="utf-8",
            )

            result = AppbaseIntegrationGuardian(root=root).run()

            self.assertFalse(result.ok)
            self.assertIn(
                "appbase integration commerce frontend source apps/sdkwork-clawrouter-pc/packages/sdkwork-clawrouter-pc-admin-payments/src/nested/directSdk.ts must not import ClawRouter generated SDK packages; use the local commerce service boundary",
                result.messages,
            )

    def test_rejects_verification_command_without_real_test_module(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            self.write_valid_files(root)
            self.write_integration_manifest(
                root,
                """
                schemaVersion: 1
                kind: sdkwork.appbase.integration
                app:
                  key: sdkwork-clawrouter
                integrations:
                  - capability: commerce
                    requiredMaturity: L3
                    surfaces: [app]
                    frontend:
                      dependencies:
                        - "@sdkwork/commerce-service"
                      adapters:
                        - apps/sdkwork-clawrouter-pc/packages/sdkwork-clawroutes-pc-commons/src/commerce-runtime.ts
                    verification:
                      - python -B -m unittest tests.test_missing_appbase_integration
                    forbiddenProductForks: []
                    sdkBoundary: generated-sdk-through-ports
                """,
            )

            result = AppbaseIntegrationGuardian(root=root).run()

            self.assertFalse(result.ok)
            self.assertIn(
                "appbase integration commerce verification command references missing unittest module: tests.test_missing_appbase_integration",
                result.messages,
            )

    def test_rejects_integration_without_verification_commands(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            self.write_valid_files(root)
            self.write_integration_manifest(
                root,
                """
                schemaVersion: 1
                kind: sdkwork.appbase.integration
                app:
                  key: sdkwork-clawrouter
                integrations:
                  - capability: commerce
                    requiredMaturity: L3
                    surfaces: [app]
                    frontend:
                      dependencies:
                        - "@sdkwork/commerce-service"
                      adapters:
                        - apps/sdkwork-clawrouter-pc/packages/sdkwork-clawroutes-pc-commons/src/commerce-runtime.ts
                    forbiddenProductForks: []
                    sdkBoundary: generated-sdk-through-ports
                """,
            )

            result = AppbaseIntegrationGuardian(root=root).run()

            self.assertFalse(result.ok)
            self.assertIn(
                "appbase integration commerce must declare verification commands",
                result.messages,
            )

    def test_rejects_unsupported_verification_command(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            self.write_valid_files(root)
            self.write_integration_manifest(
                root,
                """
                schemaVersion: 1
                kind: sdkwork.appbase.integration
                app:
                  key: sdkwork-clawrouter
                integrations:
                  - capability: commerce
                    requiredMaturity: L3
                    surfaces: [app]
                    frontend:
                      dependencies:
                        - "@sdkwork/commerce-service"
                      adapters:
                        - apps/sdkwork-clawrouter-pc/packages/sdkwork-clawroutes-pc-commons/src/commerce-runtime.ts
                    verification:
                      - npm test
                    forbiddenProductForks: []
                    sdkBoundary: generated-sdk-through-ports
                """,
            )

            result = AppbaseIntegrationGuardian(root=root).run()

            self.assertFalse(result.ok)
            self.assertIn(
                "appbase integration commerce verification command must use a supported executable form: npm test",
                result.messages,
            )

    def test_real_claw_router_appbase_integration_manifest_passes(self) -> None:
        result = AppbaseIntegrationGuardian(root=REPO_ROOT).run()

        self.assertTrue(result.ok, result.messages)

    def test_allows_dedicated_public_vip_purchase_module(self) -> None:
        guardian = AppbaseIntegrationGuardian(root=REPO_ROOT)

        messages = guardian._validate_commerce_text(
            "appbase integration commerce",
            "sdkwork-clawrouter-pc-vip",
        )

        self.assertEqual([], messages)

    def test_rejects_retired_admin_vip_frontend_artifact(self) -> None:
        guardian = AppbaseIntegrationGuardian(root=REPO_ROOT)

        messages = guardian._validate_commerce_text(
            "appbase integration commerce",
            "sdkwork-clawrouter-pc-admin-vip",
        )

        self.assertIn(
            "appbase integration commerce must not reference retired commerce frontend artifact: "
            "sdkwork-clawrouter-pc-admin-vip",
            messages,
        )

    def test_cli_reports_success(self) -> None:
        completed = subprocess.run(
            [sys.executable, "-B", "-m", "tools.appbase_integration_guardian", "--root", str(REPO_ROOT)],
            cwd=REPO_ROOT,
            text=True,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            check=False,
        )

        self.assertEqual(completed.returncode, 0, completed.stdout + completed.stderr)
        self.assertIn("Appbase integration guardian passed", completed.stdout)


if __name__ == "__main__":
    unittest.main()
