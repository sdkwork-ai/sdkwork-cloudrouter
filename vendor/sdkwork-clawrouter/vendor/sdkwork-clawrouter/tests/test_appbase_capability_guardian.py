import json
import subprocess
import sys
import tempfile
import textwrap
import unittest
from pathlib import Path

from tools.appbase_capability_guardian import AppbaseCapabilityGuardian


REPO_ROOT = Path(__file__).resolve().parents[1]
APPBASE_ROOT = Path(".sdkwork") / "dependencies" / "sdkwork-appbase"


def retired_appbase_sdk_clients_module() -> str:
    return "-".join(["appbase", "sdk", "clients"])


class AppbaseCapabilityGuardianTest(unittest.TestCase):
    def write_manifest(self, root: Path, content: str) -> Path:
        manifest = root / APPBASE_ROOT / "specs" / "appbase-capabilities.yaml"
        manifest.parent.mkdir(parents=True, exist_ok=True)
        manifest.write_text(textwrap.dedent(content).strip() + "\n", encoding="utf-8")
        return manifest

    def write_package(self, root: Path, relative_path: str, package_type: str) -> None:
        package = root / APPBASE_ROOT / relative_path
        package.mkdir(parents=True, exist_ok=True)
        npm_name = package.name.removeprefix("sdkwork-")
        package.joinpath("package.json").write_text(
            json.dumps(
                {
                    "name": f"@sdkwork/{npm_name}",
                    "version": "0.1.0",
                    "type": "module",
                    "scripts": {
                        "test": "vitest run",
                        "typecheck": "tsc --noEmit",
                    },
                    "sdkwork": {
                        "domain": package.parent.name,
                        "capability": package.name,
                        "packageType": package_type,
                        "status": "standard",
                    },
                },
                indent=2,
            )
            + "\n",
            encoding="utf-8",
        )

    def write_crate(self, root: Path, relative_path: str) -> None:
        crate = root / APPBASE_ROOT / relative_path
        crate.mkdir(parents=True, exist_ok=True)
        crate_name = crate.name.removeprefix("sdkwork-").removesuffix("-rust").replace("-", "_")
        crate.joinpath("Cargo.toml").write_text(
            textwrap.dedent(
                f"""
                [package]
                name = "sdkwork_{crate_name}"
                version = "0.1.0"
                edition = "2021"
                """
            ).strip()
            + "\n",
            encoding="utf-8",
        )

    def complete_l3_manifest(self) -> str:
        return """
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
            scope:
              - product-center
              - catalog
              - spu
              - sku
              - category
              - attribute
              - price-list
              - inventory
              - cart
              - addresses
              - checkout
              - orders
              - payments
              - refunds
              - fulfillments
              - shipments
              - memberships
              - points
              - recharges
              - wallet
              - coupons
              - invoices
              - settlements
              - audit
              - reports
              - payment-providers
              - payment-provider-accounts
              - payment-methods
              - payment-channels
              - payment-route-rules
              - payment-webhooks
              - payment-reconciliation
            requiredLayers:
              - kind: contracts
                path: packages/common/commerce/sdkwork-commerce-contracts
                manifest: package.json
              - kind: sdk_ports
                path: packages/common/commerce/sdkwork-commerce-sdk-ports
                manifest: package.json
              - kind: service
                path: packages/common/commerce/sdkwork-commerce-service
                manifest: package.json
              - kind: runtime
                path: packages/common/commerce/sdkwork-commerce-runtime
                manifest: package.json
              - kind: native_rust_core
                path: packages/native-rust/commerce/sdkwork-commerce-core-rust
                manifest: Cargo.toml
              - kind: native_rust_storage_sqlx
                path: packages/native-rust/commerce/sdkwork-commerce-storage-sqlx-rust
                manifest: Cargo.toml
              - kind: pc_react
                path: packages/pc-react/commerce/sdkwork-commerce-pc-react
                manifest: package.json
            qualityGates:
              - category: contract
                command: pnpm --filter @sdkwork/commerce-contracts test
              - category: runtime
                command: pnpm --filter @sdkwork/commerce-runtime test
              - category: storage
                command: cargo test -p sdkwork_commerce_storage_sqlx
              - category: frontend
                command: pnpm --filter @sdkwork/commerce-pc-react test
            integration:
              productForksForbidden: true
              sdkBoundary: generated-sdk-through-ports
        """

    def write_complete_l3_files(self, root: Path) -> None:
        self.write_package(root, "packages/common/commerce/sdkwork-commerce-contracts", "contracts")
        self.write_package(root, "packages/common/commerce/sdkwork-commerce-sdk-ports", "sdk-ports")
        self.write_package(root, "packages/common/commerce/sdkwork-commerce-service", "service")
        self.write_package(root, "packages/common/commerce/sdkwork-commerce-runtime", "runtime")
        self.write_crate(root, "packages/native-rust/commerce/sdkwork-commerce-core-rust")
        self.write_crate(root, "packages/native-rust/commerce/sdkwork-commerce-storage-sqlx-rust")
        self.write_package(root, "packages/pc-react/commerce/sdkwork-commerce-pc-react", "react")

    def test_accepts_l3_capability_with_complete_layers_and_quality_gates(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            self.write_manifest(root, self.complete_l3_manifest())
            self.write_complete_l3_files(root)

            result = AppbaseCapabilityGuardian(root=root).run()

            self.assertTrue(result.ok, result.messages)

    def test_accepts_externalized_l3_capability_with_external_layers(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            self.write_manifest(
                root,
                """
                schemaVersion: 1
                kind: sdkwork.appbase.capability.catalog
                capabilities:
                  - id: messaging
                    domain: messaging
                    status: externalized
                    maturity: L3
                    targetMaturity: L3
                    priority: P0
                    owner: sdkwork-messaging
                    externalRepository: ../sdkwork-messaging
                    externalLayers:
                      - kind: contracts
                        package: "@sdkwork/messaging-contracts"
                        path: ../sdkwork-messaging/packages/common/messaging/sdkwork-messaging-contracts
                      - kind: sdk_ports
                        package: "@sdkwork/messaging-sdk-ports"
                        path: ../sdkwork-messaging/packages/common/messaging/sdkwork-messaging-sdk-ports
                      - kind: service
                        package: "@sdkwork/messaging-service"
                        path: ../sdkwork-messaging/packages/common/messaging/sdkwork-messaging-service
                      - kind: runtime
                        package: "@sdkwork/messaging-runtime"
                        path: ../sdkwork-messaging/packages/common/messaging/sdkwork-messaging-runtime
                      - kind: native_rust_core
                        crate: sdkwork_messaging_core
                        path: ../sdkwork-messaging/packages/native-rust/messaging/sdkwork-messaging-core-rust
                      - kind: native_rust_storage_sqlx
                        crate: sdkwork_messaging_storage_sqlx
                        path: ../sdkwork-messaging/packages/native-rust/messaging/sdkwork-messaging-storage-sqlx-rust
                    qualityGates:
                      - category: contract
                        command: pnpm --dir ../sdkwork-messaging --filter @sdkwork/messaging-contracts test
                      - category: runtime
                        command: pnpm --dir ../sdkwork-messaging --filter @sdkwork/messaging-runtime test
                      - category: storage
                        command: cargo test --manifest-path ../sdkwork-messaging/packages/native-rust/messaging/sdkwork-messaging-storage-sqlx-rust/Cargo.toml
                    integration:
                      domainForksForbidden: true
                      sdkBoundary: generated-sdk-through-ports
                """,
            )

            result = AppbaseCapabilityGuardian(root=root).run()

            self.assertTrue(result.ok, result.messages)

    def test_rejects_l3_capability_missing_storage_and_frontend_layers(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            self.write_manifest(
                root,
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
                    requiredLayers:
                      - kind: contracts
                        path: packages/common/commerce/sdkwork-commerce-contracts
                        manifest: package.json
                      - kind: sdk_ports
                        path: packages/common/commerce/sdkwork-commerce-sdk-ports
                        manifest: package.json
                      - kind: service
                        path: packages/common/commerce/sdkwork-commerce-service
                        manifest: package.json
                      - kind: runtime
                        path: packages/common/commerce/sdkwork-commerce-runtime
                        manifest: package.json
                      - kind: native_rust_core
                        path: packages/native-rust/commerce/sdkwork-commerce-core-rust
                        manifest: Cargo.toml
                    qualityGates:
                      - category: contract
                        command: pnpm --filter @sdkwork/commerce-contracts test
                      - category: runtime
                        command: pnpm --filter @sdkwork/commerce-runtime test
                      - category: storage
                        command: cargo test -p sdkwork_commerce_storage_sqlx
                      - category: frontend
                        command: pnpm --filter @sdkwork/commerce-pc-react test
                    integration:
                      productForksForbidden: true
                      sdkBoundary: generated-sdk-through-ports
                """,
            )
            self.write_package(root, "packages/common/commerce/sdkwork-commerce-contracts", "contracts")
            self.write_package(root, "packages/common/commerce/sdkwork-commerce-sdk-ports", "sdk-ports")
            self.write_package(root, "packages/common/commerce/sdkwork-commerce-service", "service")
            self.write_package(root, "packages/common/commerce/sdkwork-commerce-runtime", "runtime")
            self.write_crate(root, "packages/native-rust/commerce/sdkwork-commerce-core-rust")

            result = AppbaseCapabilityGuardian(root=root).run()

            self.assertFalse(result.ok)
            self.assertIn(
                "capability commerce declares L3 but is missing required layer kind: native_rust_storage_sqlx",
                result.messages,
            )
            self.assertIn(
                "capability commerce declares L3 but is missing required layer kind: pc_react",
                result.messages,
            )

    def test_rejects_appbase_sdk_clients_and_concrete_app_sdk_imports(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            self.write_manifest(root, self.complete_l3_manifest())
            self.write_complete_l3_files(root)
            debt_package = root / APPBASE_ROOT / "packages" / "common" / "commerce" / retired_appbase_sdk_clients_module()
            debt_package.mkdir(parents=True, exist_ok=True)
            service_file = (
                root
                / APPBASE_ROOT
                / "packages"
                / "common"
                / "commerce"
                / "sdkwork-commerce-service"
                / "src"
                / "bad.ts"
            )
            service_file.parent.mkdir(parents=True, exist_ok=True)
            service_file.write_text(
                "import { SdkworkAppClient } from '@sdkwork/clawrouter-app-sdk';\n",
                encoding="utf-8",
            )

            result = AppbaseCapabilityGuardian(root=root).run()

            self.assertFalse(result.ok)
            self.assertIn(
                f"sdkwork-appbase contains forbidden {retired_appbase_sdk_clients_module()} path: packages/common/commerce/{retired_appbase_sdk_clients_module()}",
                result.messages,
            )
            self.assertIn(
                "sdkwork-appbase reusable package imports concrete application SDK @sdkwork/clawrouter-app-sdk: packages/common/commerce/sdkwork-commerce-service/src/bad.ts",
                result.messages,
            )

    def test_rejects_commerce_capability_with_billing_namespace_scope_or_table(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            self.write_manifest(
                root,
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
                    scope:
                      - billing
                      - billing-prehold
                    sdkNamespaces: [billing]
                    tables: [commerce_billing_prehold]
                    requiredLayers:
                      - kind: contracts
                        path: packages/common/commerce/sdkwork-commerce-contracts
                        manifest: package.json
                      - kind: sdk_ports
                        path: packages/common/commerce/sdkwork-commerce-sdk-ports
                        manifest: package.json
                      - kind: service
                        path: packages/common/commerce/sdkwork-commerce-service
                        manifest: package.json
                      - kind: runtime
                        path: packages/common/commerce/sdkwork-commerce-runtime
                        manifest: package.json
                      - kind: native_rust_core
                        path: packages/native-rust/commerce/sdkwork-commerce-core-rust
                        manifest: Cargo.toml
                      - kind: native_rust_storage_sqlx
                        path: packages/native-rust/commerce/sdkwork-commerce-storage-sqlx-rust
                        manifest: Cargo.toml
                      - kind: pc_react
                        path: packages/pc-react/commerce/sdkwork-commerce-pc-react
                        manifest: package.json
                    qualityGates:
                      - category: contract
                        command: pnpm --filter @sdkwork/commerce-contracts test
                      - category: runtime
                        command: pnpm --filter @sdkwork/commerce-runtime test
                      - category: storage
                        command: cargo test -p sdkwork_commerce_storage_sqlx
                      - category: frontend
                        command: pnpm --filter @sdkwork/commerce-pc-react test
                    integration:
                      productForksForbidden: true
                      sdkBoundary: generated-sdk-through-ports
                """,
            )
            self.write_complete_l3_files(root)

            result = AppbaseCapabilityGuardian(root=root).run()

            self.assertFalse(result.ok)
            self.assertIn("capability commerce must not declare billing scope: billing", result.messages)
            self.assertIn("capability commerce must not declare billing scope: billing-prehold", result.messages)
            self.assertIn("capability commerce must not declare SDK namespace billing", result.messages)
            self.assertIn("capability commerce must not declare billing table: commerce_billing_prehold", result.messages)

    def test_rejects_commerce_capability_without_unified_product_center_scope(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            manifest = self.complete_l3_manifest()
            scope_start = manifest.index("            scope:")
            layers_start = manifest.index("            requiredLayers:")
            manifest = (
                manifest[:scope_start]
                + "            scope:\n"
                + "              - cart\n"
                + "              - checkout\n"
                + "              - orders\n"
                + "              - payments\n"
                + manifest[layers_start:]
            )
            self.write_manifest(root, manifest)
            self.write_complete_l3_files(root)

            result = AppbaseCapabilityGuardian(root=root).run()

            self.assertFalse(result.ok)
            for missing_scope in [
                "product-center",
                "catalog",
                "spu",
                "sku",
                "category",
                "attribute",
                "price-list",
                "inventory",
            ]:
                self.assertIn(
                    f"capability commerce must declare unified product center scope: {missing_scope}",
                    result.messages,
                )

    def test_rejects_commerce_capability_without_complete_transaction_closure_scope(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            manifest = self.complete_l3_manifest()
            scope_start = manifest.index("            scope:")
            layers_start = manifest.index("            requiredLayers:")
            manifest = (
                manifest[:scope_start]
                + "            scope:\n"
                + "              - product-center\n"
                + "              - catalog\n"
                + "              - spu\n"
                + "              - sku\n"
                + "              - category\n"
                + "              - attribute\n"
                + "              - price-list\n"
                + "              - inventory\n"
                + manifest[layers_start:]
            )
            self.write_manifest(root, manifest)
            self.write_complete_l3_files(root)

            result = AppbaseCapabilityGuardian(root=root).run()

            self.assertFalse(result.ok)
            for missing_scope in [
                "cart",
                "addresses",
                "checkout",
                "orders",
                "payments",
                "payment-provider-accounts",
                "payment-route-rules",
                "payment-webhooks",
                "payment-reconciliation",
                "refunds",
                "fulfillments",
                "shipments",
                "memberships",
                "points",
                "recharges",
                "wallet",
                "coupons",
                "invoices",
                "settlements",
            ]:
                self.assertIn(
                    f"capability commerce must declare complete commerce closure scope: {missing_scope}",
                    result.messages,
                )

    def test_rejects_inconsistent_maturity_and_status(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            self.write_manifest(
                root,
                """
                schemaVersion: 1
                kind: sdkwork.appbase.capability.catalog
                capabilities:
                  - id: notification
                    domain: notification
                    status: standard
                    maturity: L1
                    targetMaturity: L0
                    priority: P0
                    owner: sdkwork-appbase
                    requiredLayers:
                      - kind: pc_react
                        path: packages/pc-react/notification/sdkwork-notification-pc-react
                        manifest: package.json
                    qualityGates:
                      - category: frontend
                        command: pnpm --filter @sdkwork/notification-pc-react typecheck
                    integration:
                      productForksForbidden: true
                      sdkBoundary: generated-sdk-through-ports
                """,
            )
            self.write_package(root, "packages/pc-react/notification/sdkwork-notification-pc-react", "react")

            result = AppbaseCapabilityGuardian(root=root).run()

            self.assertFalse(result.ok)
            self.assertIn(
                "capability notification status standard requires maturity L3",
                result.messages,
            )
            self.assertIn(
                "capability notification targetMaturity L0 cannot be lower than maturity L1",
                result.messages,
            )

    def test_rejects_quality_gate_commands_without_real_package_script_or_crate(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            self.write_manifest(
                root,
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
                    requiredLayers:
                      - kind: contracts
                        path: packages/common/commerce/sdkwork-commerce-contracts
                        manifest: package.json
                      - kind: sdk_ports
                        path: packages/common/commerce/sdkwork-commerce-sdk-ports
                        manifest: package.json
                      - kind: service
                        path: packages/common/commerce/sdkwork-commerce-service
                        manifest: package.json
                      - kind: runtime
                        path: packages/common/commerce/sdkwork-commerce-runtime
                        manifest: package.json
                      - kind: native_rust_core
                        path: packages/native-rust/commerce/sdkwork-commerce-core-rust
                        manifest: Cargo.toml
                      - kind: native_rust_storage_sqlx
                        path: packages/native-rust/commerce/sdkwork-commerce-storage-sqlx-rust
                        manifest: Cargo.toml
                      - kind: pc_react
                        path: packages/pc-react/commerce/sdkwork-commerce-pc-react
                        manifest: package.json
                    qualityGates:
                      - category: contract
                        command: pnpm --filter @sdkwork/missing-contracts test
                      - category: runtime
                        command: pnpm --filter @sdkwork/commerce-runtime missing-script
                      - category: storage
                        command: cargo test -p missing_crate
                      - category: frontend
                        command: pnpm --filter @sdkwork/commerce-pc-react typecheck
                    integration:
                      productForksForbidden: true
                      sdkBoundary: generated-sdk-through-ports
                """,
            )
            self.write_complete_l3_files(root)

            result = AppbaseCapabilityGuardian(root=root).run()

            self.assertFalse(result.ok)
            self.assertIn(
                "capability commerce quality gate contract references unknown pnpm package: @sdkwork/missing-contracts",
                result.messages,
            )
            self.assertIn(
                "capability commerce quality gate runtime references missing script missing-script in package @sdkwork/commerce-runtime",
                result.messages,
            )
            self.assertIn(
                "capability commerce quality gate storage references unknown cargo package: missing_crate",
                result.messages,
            )

    def test_real_appbase_capability_manifest_passes(self) -> None:
        result = AppbaseCapabilityGuardian(root=REPO_ROOT).run()

        self.assertTrue(result.ok, result.messages)

    def test_cli_reports_success(self) -> None:
        completed = subprocess.run(
            [sys.executable, "-B", "-m", "tools.appbase_capability_guardian", "--root", str(REPO_ROOT)],
            cwd=REPO_ROOT,
            text=True,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            check=False,
        )

        self.assertEqual(completed.returncode, 0, completed.stdout + completed.stderr)
        self.assertIn("Appbase capability guardian passed", completed.stdout)


if __name__ == "__main__":
    unittest.main()
