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


class CheckoutRuntimeStandardTest(unittest.TestCase):
    def test_checkout_contract_is_backed_by_commerce_dependency_not_product_local_code(self) -> None:
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

        self.assertIn("operation: fetchCheckoutStatus", contract)
        self.assertIn("operation_id: console.checkoutStatus.retrieve", contract)
        self.assertIn("api_path: /app/v3/api/recharges/orders/{orderId}", contract)
        for source in ["commerce_order", "commerce_payment_intent", "commerce_payment_attempt"]:
            self.assertIn(source, contract)

        self.assertFalse(
            (ROOT / "services" / "sdkwork-clawrouter-router-service" / "src" / "api" / "app_checkout.rs").exists()
        )
        self.assertFalse(
            (ROOT / "services" / "sdkwork-clawrouter-router-service" / "src" / "ports" / "checkout_store.rs").exists()
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
                / "checkout_store.rs"
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
                / "checkout_store.rs"
            ).exists()
        )
        self.assertNotIn("app_checkout_router", product_api_mod)
        self.assertNotIn("CheckoutStore", product_ports_mod)
        self.assertNotIn("CheckoutStore", app_api)
        self.assertNotIn("app_checkout_router()", app_api)
        self.assertIn("pub use sdkwork_routes_clawrouter_app_api::*;", app_api)
        self.assertIn("is_commerce_dependency_contract_path", app_routes)
        self.assertIn('"/app/v3/api/recharges/"', app_routes)
        self.assertIn("app_recharge_checkout_router_with_sqlite_pool", commerce_http)
        self.assertIn("app_recharge_checkout_router_with_postgres_pool", commerce_http)
        self.assertIn("validate_checkout_order_no", commerce_http)
        self.assertIn("CommerceRechargeCheckoutStore", commerce_http)

    def test_checkout_sql_projection_is_defined_in_commerce_storage(self) -> None:
        for store_path in COMMERCE_RECHARGE_STORES:
            store = store_path.read_text(encoding="utf-8")
            compact_store = " ".join(store.split())

            self.assertIn("LOAD_CHECKOUT_STATUS", store)
            self.assertIn("commerce_order", store)
            self.assertIn("commerce_payment_intent", store)
            self.assertIn("commerce_payment_attempt", store)
            self.assertIn("query.tenant_id", store)
            self.assertIn("query.organization_id", store)
            self.assertIn("query.owner_user_id", store)
            self.assertIn("o.order_no", store)
            self.assertIn("pa.out_trade_no", store)
            self.assertIn("pi.status AS payment_status", store)
            self.assertIn("pa.status AS payment_attempt_status", store)
            self.assertIn("load_checkout_status", store)
            self.assertIn("row.as_ref().map(map_checkout_status).transpose()", store)
            self.assertIn("unsupported checkout order status", store)
            self.assertIn("unsupported checkout payment status", store)
            self.assertIn("missing checkout order status from database row", store)
            self.assertIn("missing checkout payment status from database row", store)
            self.assertIn(
                'let order_status_value = required_status_cell(row, "order_status", "order")?;',
                compact_store,
            )
            self.assertIn(
                'let payment_status_value = related_status_cell(row, "payment_id", "payment_status", "payment")?;',
                compact_store,
            )
            self.assertIn(
                'related_status_cell( row, "payment_attempt_id", "payment_attempt_status", "payment attempt", )?',
                compact_store,
            )
            self.assertNotIn("plus_order", store)
            self.assertNotIn("plus_payment", store)
            self.assertNotIn("plus_vip_recharge", store)

    def test_console_checkout_uses_sdk_status_and_has_no_fake_success_branch(self) -> None:
        checkout_view_path = (
            ROOT
            / "apps"
            / "sdkwork-clawrouter-pc"
            / "packages"
            / "sdkwork-clawrouter-pc-console-checkout"
            / "src"
            / "CheckoutView.tsx"
        )
        if not checkout_view_path.exists():
            self.skipTest("console checkout package removed; checkout UI is owned by sdkwork-commerce")
        checkout_view = checkout_view_path.read_text(encoding="utf-8")
        checkout_service = (
            ROOT
            / "apps"
            / "sdkwork-clawrouter-pc"
            / "packages"
            / "sdkwork-clawrouter-pc-console-checkout"
            / "src"
            / "checkoutService.ts"
        ).read_text(encoding="utf-8")

        self.assertIn(
            "import { getSdkworkCommerceService } from '@sdkwork/commerce-service';",
            checkout_service,
        )
        self.assertIn("appRechargesOrdersRetrieve(safeOrderNo)", checkout_service)
        self.assertIn(
            "getSdkworkCommerceService().recharges.orders.retrieve(orderId)",
            checkout_service,
        )
        self.assertNotIn(
            "getClawRouterAppSdkClient().commerce.recharges.orders.retrieve",
            checkout_service,
        )
        self.assertIn("readCheckoutStatusValue(", checkout_service)
        self.assertIn("normalizeCheckoutStatus", checkout_service)
        self.assertNotIn("fetch('/app/v3/api", checkout_service)
        self.assertNotIn("axios", checkout_service)
        self.assertIn("return 'pending';", checkout_service)
        self.assertIn("CheckoutService.fetchCheckoutStatus", checkout_view)
        self.assertIn("RechargeService.submitRecharge", checkout_view)
        self.assertNotIn("handleSimulatePayment", checkout_view)
        self.assertNotIn("setIsSuccess(true)", checkout_view)
        self.assertNotIn("isSuccess", checkout_view)


if __name__ == "__main__":
    unittest.main()
