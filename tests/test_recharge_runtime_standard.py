import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
WORKSPACE_ROOT = ROOT.parent
COMMERCE_ROOT = WORKSPACE_ROOT / "sdkwork-commerce"
COMMERCE_API_SERVER = COMMERCE_ROOT / "crates" / "sdkwork-commerce-api-server"
COMMERCE_STORAGE_SQLX = (
    COMMERCE_ROOT / "crates" / "sdkwork-commerce-storage-repository-sqlx"
)
COMMERCE_RECHARGE_STORES = [
    COMMERCE_STORAGE_SQLX / "src" / "sqlite_recharge.rs",
    COMMERCE_STORAGE_SQLX / "src" / "postgres_recharge.rs",
]


class RechargeRuntimeStandardTest(unittest.TestCase):
    def test_recharge_contracts_are_backed_by_commerce_dependency_not_product_local_code(self) -> None:
        contract = (ROOT / "docs" / "schema-registry" / "frontend-field-contracts.yaml").read_text(
            encoding="utf-8"
        )
        product_api_mod = (
            ROOT / "services" / "sdkwork-clawrouter-router-service" / "src" / "api" / "mod.rs"
        ).read_text(encoding="utf-8")
        product_ports_mod = (
            ROOT / "services" / "sdkwork-clawrouter-router-service" / "src" / "ports" / "mod.rs"
        ).read_text(encoding="utf-8")
        app_api = (ROOT / "services" / "sdkwork-clawrouter-app-api-server" / "src" / "lib.rs").read_text(
            encoding="utf-8"
        )
        app_routes = (
            ROOT / "crates" / "sdkwork-routes-clawrouter-app-api" / "src" / "routes.rs"
        ).read_text(encoding="utf-8")
        commerce_http = (
            COMMERCE_API_SERVER / "src" / "recharge_router.rs"
        ).read_text(encoding="utf-8")

        self.assertIn("operation: fetchRechargePackages", contract)
        self.assertIn("operation_id: console.rechargePackages.list", contract)
        self.assertIn("api_path: /app/v3/api/recharges/packages", contract)
        self.assertIn("operation: submitRecharge", contract)
        self.assertIn("operation_id: console.rechargeOrders.create", contract)
        self.assertIn("api_path: /app/v3/api/recharges/orders", contract)
        submit_operation_start = contract.index("operation: submitRecharge")
        submit_recharge_start = contract.rfind("- route: /console/recharge", 0, submit_operation_start)
        next_route_start = contract.find("\n- route:", submit_operation_start + 1)
        if next_route_start == -1:
            next_route_start = len(contract)
        submit_recharge_contract = contract[submit_recharge_start:next_route_start]
        for table_name in [
            "- commerce_order",
            "- commerce_order_item",
            "- commerce_payment_intent",
            "- ops_audit_log",
        ]:
            self.assertIn(table_name, submit_recharge_contract)

        self.assertFalse(
            (ROOT / "services" / "sdkwork-clawrouter-router-service" / "src" / "api" / "app_recharge.rs").exists()
        )
        self.assertFalse(
            (ROOT / "services" / "sdkwork-clawrouter-router-service" / "src" / "ports" / "recharge_store.rs").exists()
        )
        self.assertFalse(
            (
                ROOT
                / "services"
                / "sdkwork-clawrouter-router-service"
                / "src"
                / "infrastructure"
                / "sql"
                / "sqlite"
                / "recharge_store.rs"
            ).exists()
        )
        self.assertFalse(
            (
                ROOT
                / "services"
                / "sdkwork-clawrouter-router-service"
                / "src"
                / "infrastructure"
                / "sql"
                / "postgres"
                / "recharge_store.rs"
            ).exists()
        )
        self.assertNotIn("app_recharge_router", product_api_mod)
        self.assertNotIn("RechargeStore", product_ports_mod)
        self.assertNotIn("RechargeStore", app_api)
        self.assertNotIn("app_recharge_router()", app_api)
        self.assertIn("pub use sdkwork_routes_clawrouter_app_api::*;", app_api)
        self.assertIn("is_commerce_dependency_contract_path", app_routes)
        self.assertIn('"/app/v3/api/recharges/"', app_routes)
        self.assertIn("app_recharge_checkout_router_with_sqlite_pool", commerce_http)
        self.assertIn("app_recharge_checkout_router_with_postgres_pool", commerce_http)
        self.assertIn("validate_recharge_amount", commerce_http)
        self.assertIn("DEFAULT_RECHARGE_PAYMENT_METHOD", commerce_http)
        self.assertIn("CommerceRechargeCheckoutStore", commerce_http)

    def test_recharge_sql_write_path_is_defined_in_commerce_storage(self) -> None:
        for store_path in COMMERCE_RECHARGE_STORES:
            store = store_path.read_text(encoding="utf-8")
            compact_store = " ".join(store.split())

            self.assertIn("commerce_recharge_package", store)
            self.assertIn("commerce_payment_method", store)
            self.assertIn("commerce_product_spu", store)
            self.assertIn("commerce_product_sku", store)
            self.assertIn("commerce_order", store)
            self.assertIn("commerce_order_item", store)
            self.assertIn("commerce_order_amount_breakdown", store)
            self.assertIn("commerce_payment_intent", store)
            self.assertIn("commerce_payment_attempt", store)
            self.assertIn("list_recharge_packages", store)
            self.assertIn("create_points_recharge_order", store)
            self.assertIn("insert_order", store)
            self.assertIn("insert_order_item", store)
            self.assertIn("insert_order_amount_breakdown", store)
            self.assertIn("insert_payment", store)
            self.assertIn("command.tenant_id", store)
            self.assertIn("command.organization_id", store)
            self.assertIn("command.owner_user_id", store)
            self.assertIn("CommercePaymentStatus::Pending.as_str()", store)
            self.assertIn(
                "pack.as_ref().map(|item| item.bonus_points).unwrap_or(0)",
                compact_store,
            )
            self.assertNotIn("plus_vip_recharge_pack", store)
            self.assertNotIn("plus_vip_recharge_method", store)
            self.assertNotIn("plus_order", store)
            self.assertNotIn("plus_payment", store)
            self.assertNotIn("insert_vip_recharge", store)

    def test_console_recharge_uses_generated_sdk_service_adapter(self) -> None:
        recharge_view_path = (
            ROOT
            / "apps"
            / "sdkwork-clawrouter-pc"
            / "packages"
            / "sdkwork-clawrouter-pc-console-recharge"
            / "src"
            / "RechargeView.tsx"
        )
        if not recharge_view_path.exists():
            self.skipTest("console recharge package removed; recharge UI is owned by sdkwork-commerce")
        recharge_view = recharge_view_path.read_text(encoding="utf-8")
        recharge_service = (
            ROOT
            / "apps"
            / "sdkwork-clawrouter-pc"
            / "packages"
            / "sdkwork-clawrouter-pc-console-recharge"
            / "src"
            / "rechargeService.ts"
        ).read_text(encoding="utf-8")

        self.assertIn(
            "import { getSdkworkCommerceService } from '@sdkwork/commerce-service';",
            recharge_service,
        )
        self.assertIn("appRechargesPackagesList({ status: 'active' })", recharge_service)
        self.assertIn(
            "getSdkworkCommerceService().recharges.packages.list(params)",
            recharge_service,
        )
        self.assertIn("appRechargesOrdersCreate({", recharge_service)
        self.assertIn(
            "getSdkworkCommerceService().recharges.orders.create(",
            recharge_service,
        )
        self.assertNotIn("getClawRouterAppSdkClient().commerce.recharges", recharge_service)
        self.assertIn("createCommerceRequestNo('recharge')", recharge_service)
        self.assertIn("moneyAmount(amount, 'amount')", recharge_service)
        self.assertIn("formatMoneyString", recharge_service)
        self.assertIn(
            "readOptionalNonNegativeNumber(item, ['bonusPoints', 'bonus_points'])",
            recharge_service,
        )
        self.assertIn("readRequiredBoolean(data, 'success', 'Recharge success flag is required')", recharge_service)
        self.assertNotIn("fetch('/app/v3/api", recharge_service)
        self.assertNotIn("axios", recharge_service)
        self.assertNotIn("Number(normalized)", recharge_service)
        self.assertIn("RechargeService.submitRecharge", recharge_view)
        self.assertIn("navigate(`/console/checkout?orderNo=${encodeURIComponent(response.orderNo)}`)", recharge_view)
        self.assertNotIn("fetchRechargeHistory", recharge_view)


if __name__ == "__main__":
    unittest.main()
