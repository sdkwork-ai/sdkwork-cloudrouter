#!/usr/bin/env python3
from __future__ import annotations

import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
P = ROOT / "crates/sdkwork-commerce-api-server/src/shop_router.rs"

MACRO = r"""
macro_rules! impl_shop_store_forward {
    ($store:ty) => {
        impl CommerceShopStore for $store {
            fn list_shops<'a>(&'a self, query: ShopListQuery) -> CommerceShopFuture<'a, ShopPage<ShopSummaryView>> { Box::pin(async move { self.list_shops(query).await }) }
            fn retrieve_shop<'a>(&'a self, query: ShopDetailQuery) -> CommerceShopFuture<'a, Option<ShopSummaryView>> { Box::pin(async move { self.retrieve_shop(query).await }) }
            fn retrieve_current_shop<'a>(&'a self, scope: ShopScopeQuery) -> CommerceShopFuture<'a, Option<ShopSummaryView>> { Box::pin(async move { self.retrieve_current_shop(scope).await }) }
            fn list_dashboard_snapshots<'a>(&'a self, scope: ShopScopeQuery) -> CommerceShopFuture<'a, Vec<serde_json::Value>> { Box::pin(async move { self.list_dashboard_snapshots(scope).await }) }
            fn list_category_bindings<'a>(&'a self, scope: ShopScopeQuery) -> CommerceShopFuture<'a, Vec<serde_json::Value>> { Box::pin(async move { self.list_category_bindings(scope).await }) }
            fn upsert_category_bindings<'a>(&'a self, scope: ShopScopeQuery, payload: serde_json::Value) -> CommerceShopFuture<'a, serde_json::Value> { Box::pin(async move { self.upsert_category_bindings(scope, payload).await }) }
            fn list_brand_authorizations<'a>(&'a self, scope: ShopScopeQuery) -> CommerceShopFuture<'a, Vec<serde_json::Value>> { Box::pin(async move { self.list_brand_authorizations(scope).await }) }
            fn upsert_brand_authorizations<'a>(&'a self, scope: ShopScopeQuery, payload: serde_json::Value) -> CommerceShopFuture<'a, serde_json::Value> { Box::pin(async move { self.upsert_brand_authorizations(scope, payload).await }) }
            fn list_qualifications<'a>(&'a self, scope: ShopScopeQuery) -> CommerceShopFuture<'a, Vec<serde_json::Value>> { Box::pin(async move { self.list_qualifications(scope).await }) }
            fn upsert_qualifications<'a>(&'a self, scope: ShopScopeQuery, payload: serde_json::Value) -> CommerceShopFuture<'a, serde_json::Value> { Box::pin(async move { self.upsert_qualifications(scope, payload).await }) }
            fn list_customer_services<'a>(&'a self, scope: ShopScopeQuery) -> CommerceShopFuture<'a, Vec<serde_json::Value>> { Box::pin(async move { self.list_customer_services(scope).await }) }
            fn upsert_customer_services<'a>(&'a self, scope: ShopScopeQuery, payload: serde_json::Value) -> CommerceShopFuture<'a, serde_json::Value> { Box::pin(async move { self.upsert_customer_services(scope, payload).await }) }
            fn list_return_addresses<'a>(&'a self, scope: ShopScopeQuery) -> CommerceShopFuture<'a, Vec<serde_json::Value>> { Box::pin(async move { self.list_return_addresses(scope).await }) }
            fn upsert_return_addresses<'a>(&'a self, scope: ShopScopeQuery, payload: serde_json::Value) -> CommerceShopFuture<'a, serde_json::Value> { Box::pin(async move { self.upsert_return_addresses(scope, payload).await }) }
            fn list_shipping_templates<'a>(&'a self, scope: ShopScopeQuery) -> CommerceShopFuture<'a, Vec<serde_json::Value>> { Box::pin(async move { self.list_shipping_templates(scope).await }) }
            fn upsert_shipping_templates<'a>(&'a self, scope: ShopScopeQuery, payload: serde_json::Value) -> CommerceShopFuture<'a, serde_json::Value> { Box::pin(async move { self.upsert_shipping_templates(scope, payload).await }) }
            fn list_applications<'a>(&'a self, scope: ShopScopeQuery) -> CommerceShopFuture<'a, Vec<serde_json::Value>> { Box::pin(async move { self.list_applications(scope).await }) }
            fn upsert_applications<'a>(&'a self, scope: ShopScopeQuery, payload: serde_json::Value) -> CommerceShopFuture<'a, serde_json::Value> { Box::pin(async move { self.upsert_applications(scope, payload).await }) }
            fn list_verifications<'a>(&'a self, scope: ShopScopeQuery) -> CommerceShopFuture<'a, Vec<serde_json::Value>> { Box::pin(async move { self.list_verifications(scope).await }) }
            fn list_status_events<'a>(&'a self, scope: ShopScopeQuery) -> CommerceShopFuture<'a, Vec<serde_json::Value>> { Box::pin(async move { self.list_status_events(scope).await }) }
            fn list_channels<'a>(&'a self, scope: ShopScopeQuery) -> CommerceShopFuture<'a, Vec<serde_json::Value>> { Box::pin(async move { self.list_channels(scope).await }) }
            fn upsert_channels<'a>(&'a self, scope: ShopScopeQuery, payload: serde_json::Value) -> CommerceShopFuture<'a, serde_json::Value> { Box::pin(async move { self.upsert_channels(scope, payload).await }) }
            fn find_fulfillment_profile<'a>(&'a self, scope: ShopScopeQuery) -> CommerceShopFuture<'a, Option<serde_json::Value>> { Box::pin(async move { self.find_fulfillment_profile(scope).await }) }
            fn upsert_fulfillment_profile<'a>(&'a self, scope: ShopScopeQuery, payload: serde_json::Value) -> CommerceShopFuture<'a, serde_json::Value> { Box::pin(async move { self.upsert_fulfillment_profile(scope, payload).await }) }
            fn find_settlement_profile<'a>(&'a self, scope: ShopScopeQuery) -> CommerceShopFuture<'a, Option<serde_json::Value>> { Box::pin(async move { self.find_settlement_profile(scope).await }) }
            fn upsert_settlement_profile<'a>(&'a self, scope: ShopScopeQuery, payload: serde_json::Value) -> CommerceShopFuture<'a, serde_json::Value> { Box::pin(async move { self.upsert_settlement_profile(scope, payload).await }) }
            fn find_business_hours<'a>(&'a self, scope: ShopScopeQuery) -> CommerceShopFuture<'a, Option<serde_json::Value>> { Box::pin(async move { self.find_business_hours(scope).await }) }
            fn upsert_business_hours<'a>(&'a self, scope: ShopScopeQuery, payload: serde_json::Value) -> CommerceShopFuture<'a, serde_json::Value> { Box::pin(async move { self.upsert_business_hours(scope, payload).await }) }
            fn find_readiness<'a>(&'a self, scope: ShopScopeQuery) -> CommerceShopFuture<'a, Option<serde_json::Value>> { Box::pin(async move { self.find_readiness(scope).await }) }
            fn find_deposit_account<'a>(&'a self, scope: ShopScopeQuery) -> CommerceShopFuture<'a, Option<serde_json::Value>> { Box::pin(async move { self.find_deposit_account(scope).await }) }
            fn list_service_areas<'a>(&'a self, scope: ShopScopeQuery) -> CommerceShopFuture<'a, Vec<serde_json::Value>> { Box::pin(async move { self.list_service_areas(scope).await }) }
            fn upsert_service_areas<'a>(&'a self, scope: ShopScopeQuery, payload: serde_json::Value) -> CommerceShopFuture<'a, serde_json::Value> { Box::pin(async move { self.upsert_service_areas(scope, payload).await }) }
            fn list_policies<'a>(&'a self, scope: ShopScopeQuery) -> CommerceShopFuture<'a, Vec<serde_json::Value>> { Box::pin(async move { self.list_policies(scope).await }) }
            fn upsert_policies<'a>(&'a self, scope: ShopScopeQuery, payload: serde_json::Value) -> CommerceShopFuture<'a, serde_json::Value> { Box::pin(async move { self.upsert_policies(scope, payload).await }) }
            fn list_risk_signals<'a>(&'a self, scope: ShopScopeQuery) -> CommerceShopFuture<'a, Vec<serde_json::Value>> { Box::pin(async move { self.list_risk_signals(scope).await }) }
            fn list_shop_orders<'a>(&'a self, scope: ShopScopeQuery, page: u32, page_size: u32) -> CommerceShopFuture<'a, ShopPage<serde_json::Value>> { Box::pin(async move { self.list_shop_orders(scope, page, page_size).await }) }
            fn retrieve_shop_order<'a>(&'a self, scope: ShopScopeQuery, order_id: String) -> CommerceShopFuture<'a, Option<serde_json::Value>> { Box::pin(async move { self.retrieve_shop_order(scope, &order_id).await }) }
            fn create_shop_fulfillment<'a>(&'a self, scope: ShopScopeQuery, order_id: String, payload: serde_json::Value) -> CommerceShopFuture<'a, serde_json::Value> { Box::pin(async move { self.create_shop_fulfillment(scope, &order_id, payload).await }) }
            fn list_settlements<'a>(&'a self, scope: ShopScopeQuery) -> CommerceShopFuture<'a, ShopPage<serde_json::Value>> { Box::pin(async move { self.list_settlements(scope).await }) }
            fn list_inventory_stocks<'a>(&'a self, scope: ShopScopeQuery) -> CommerceShopFuture<'a, Vec<serde_json::Value>> { Box::pin(async move { self.list_inventory_stocks(scope).await }) }
            fn create_inventory_adjustment<'a>(&'a self, scope: ShopScopeQuery, stock_id: String, payload: serde_json::Value) -> CommerceShopFuture<'a, serde_json::Value> { Box::pin(async move { self.create_inventory_adjustment(scope, &stock_id, payload).await }) }
        }
    };
}

impl_shop_store_forward!(SqliteCommerceShopStore);
impl_shop_store_forward!(PostgresCommerceShopStore);
"""


def main() -> None:
    text = P.read_text(encoding="utf-8")
    text = re.sub(
        r"async fn ([a-z_0-9]+)\(state: AppShopState",
        r"async fn \1(State(state): State<AppShopState>",
        text,
    )
    for fn in [
        "upsert_category_bindings",
        "upsert_brand_authorizations",
        "upsert_qualifications",
        "upsert_customer_services",
        "upsert_return_addresses",
        "upsert_shipping_templates",
        "upsert_applications",
        "upsert_channels",
        "upsert_fulfillment_profile",
        "upsert_settlement_profile",
        "upsert_business_hours",
        "upsert_service_areas",
        "upsert_policies",
    ]:
        text = text.replace(
            f"fn {fn}<'a>(&'a self, ShopScopeQuery, serde_json::Value)",
            f"fn {fn}<'a>(&'a self, scope: ShopScopeQuery, payload: serde_json::Value)",
        )
    text = text.replace(
        "fn list_shop_orders<'a>(&'a self, ShopScopeQuery, u32, u32)",
        "fn list_shop_orders<'a>(&'a self, scope: ShopScopeQuery, page: u32, page_size: u32)",
    )
    text = text.replace(
        "fn retrieve_shop_order<'a>(&'a self, ShopScopeQuery, String)",
        "fn retrieve_shop_order<'a>(&'a self, scope: ShopScopeQuery, order_id: String)",
    )
    text = text.replace(
        "fn create_shop_fulfillment<'a>(&'a self, ShopScopeQuery, String, serde_json::Value)",
        "fn create_shop_fulfillment<'a>(&'a self, scope: ShopScopeQuery, order_id: String, payload: serde_json::Value)",
    )
    text = text.replace(
        "fn create_inventory_adjustment<'a>(&'a self, ShopScopeQuery, String, serde_json::Value)",
        "fn create_inventory_adjustment<'a>(&'a self, scope: ShopScopeQuery, stock_id: String, payload: serde_json::Value)",
    )
    text = text.replace(
        "fn retrieve_current_shop<'a>(&'a self, query: ShopScopeQuery)",
        "fn retrieve_current_shop<'a>(&'a self, scope: ShopScopeQuery)",
    )
    start = text.index("impl CommerceShopStore for SqliteCommerceShopStore")
    end = text.index("#[derive(Clone)]")
    text = text[:start] + MACRO + "\n" + text[end:]
    if "impl<T: Serialize> AppShopApiResult<T>" not in text:
        text = text.replace(
            "struct ListData<T: Serialize> { items: Vec<T>, page_info: PageInfo }",
            "struct ListData<T: Serialize> { items: Vec<T>, page_info: PageInfo }\n\nimpl<T: Serialize> AppShopApiResult<T> {\n    fn success(data: T) -> Self { Self { code: \"0\".into(), msg: \"success\".into(), data: Some(data) } }\n    fn error(code: &str, msg: impl Into<String>) -> Self { Self { code: code.into(), msg: msg.into(), data: None } }\n}",
        )
    text = text.replace(
        "store.find_fulfillment_profile(scope)).await",
        "store.find_readiness(scope)).await",
    )
    for fn in [
        "upsert_current_channels",
        "upsert_current_service_areas",
        "upsert_current_policies",
        "upsert_current_applications",
    ]:
        text = text.replace(f"{fn}(state, runtime_context", f"{fn}(State(state), runtime_context")
    P.write_text(text, encoding="utf-8")
    print(f"fixed {P}")


if __name__ == "__main__":
    main()
