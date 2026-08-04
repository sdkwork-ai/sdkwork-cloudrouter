use std::future::Future;
use std::pin::Pin;

use serde::{Deserialize, Serialize};
use serde_json::{Map, Value};

use crate::domain::DomainResult;

pub type AdminCatalogFuture<'a, T> = Pin<Box<dyn Future<Output = DomainResult<T>> + Send + 'a>>;

pub type AdminCatalogJsonRecord = Map<String, Value>;
#[allow(dead_code)]
pub const COMMERCE_PRODUCT_SPU_CATEGORY_TABLE: &str = "commerce_product_spu_category";

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct AdminCatalogSubject {
    pub tenant_id: i64,
    pub organization_id: i64,
    pub operator_id: i64,
    pub operator_type: i32,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct ListAdminCatalogRecordsQuery {
    pub subject: AdminCatalogSubject,
    pub page_no: i64,
    pub page_size: i64,
    pub offset: i64,
    pub status: Option<String>,
    pub parent_id: Option<String>,
    pub query_text: Option<String>,
    pub category_id: Option<String>,
    pub attribute_id: Option<String>,
    pub product_type: Option<String>,
    pub product_id: Option<String>,
    pub fulfillment_type: Option<String>,
    pub scope: Option<String>,
    pub currency_code: Option<String>,
    pub market_code: Option<String>,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct AdminCatalogCollection {
    pub items: Vec<AdminCatalogJsonRecord>,
    pub total: i64,
    pub page_no: i64,
    pub page_size: i64,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct AdminCategoryMutationCommand {
    pub subject: AdminCatalogSubject,
    pub category_id: Option<String>,
    pub category_no: String,
    pub parent_id: Option<String>,
    pub name: String,
    pub status: String,
    pub sort_order: i64,
    pub idempotency_key: String,
    pub request_id: String,
    pub requested_at: String,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct DeleteAdminCategoryCommand {
    pub subject: AdminCatalogSubject,
    pub category_id: String,
    pub request_id: String,
    pub requested_at: String,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct AdminCategoryAttributeMutationCommand {
    pub subject: AdminCatalogSubject,
    pub binding_id: Option<String>,
    pub category_id: String,
    pub attribute_id: String,
    pub required: bool,
    pub searchable: bool,
    pub filterable: bool,
    pub sort_order: i64,
    pub status: String,
    pub idempotency_key: String,
    pub request_id: String,
    pub requested_at: String,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct DeleteAdminCategoryAttributeCommand {
    pub subject: AdminCatalogSubject,
    pub binding_id: String,
    pub request_id: String,
    pub requested_at: String,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct DeleteAdminProductCommand {
    pub subject: AdminCatalogSubject,
    pub product_id: String,
    pub request_id: String,
    pub requested_at: String,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct DeleteAdminSkuCommand {
    pub subject: AdminCatalogSubject,
    pub sku_id: String,
    pub request_id: String,
    pub requested_at: String,
}

#[derive(Debug, Clone, PartialEq)]
pub struct AdminCategorySeedInitializeCommand {
    pub subject: AdminCatalogSubject,
    pub datasets: Vec<String>,
    pub bundles: Vec<AdminCategorySeedBundle>,
    pub mode: String,
    pub idempotency_key: String,
    pub request_id: String,
    pub requested_at: String,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct AdminCategorySeedInitializeSummary {
    pub dataset: String,
    pub target_table: String,
    pub requested: i64,
    pub upserted: i64,
    pub skipped: i64,
    pub install_default_enabled: bool,
    pub config_key: String,
}

#[derive(Debug, Clone, PartialEq, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AdminCategorySeedBundle {
    pub schema_version: i32,
    pub kind: String,
    pub dataset: String,
    pub target: String,
    #[serde(default)]
    pub category_type: Option<i32>,
    #[serde(default)]
    pub group_name: Option<String>,
    pub install_policy: AdminCategorySeedInstallPolicy,
    #[serde(default)]
    pub categories: Vec<AdminCategorySeedItem>,
}

#[derive(Debug, Clone, PartialEq, Eq, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AdminCategorySeedInstallPolicy {
    pub default_enabled: bool,
    pub config_key: String,
    #[serde(default)]
    pub selectable_datasets_key: Option<String>,
}

#[derive(Debug, Clone, PartialEq, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AdminCategorySeedItem {
    #[serde(default)]
    pub id: Option<Value>,
    #[serde(default)]
    pub uuid: Option<String>,
    #[serde(default)]
    pub category_no: Option<String>,
    #[serde(default)]
    pub parent_category_no: Option<String>,
    #[serde(default)]
    pub code: Option<String>,
    #[serde(default)]
    pub parent_code: Option<String>,
    pub name: String,
    #[serde(default)]
    pub description: Option<String>,
    #[serde(default)]
    pub tags: Vec<String>,
    #[serde(default)]
    pub sort_order: Option<i64>,
    #[serde(default)]
    pub sort_weight: Option<i64>,
    #[serde(default)]
    pub path: Option<String>,
    #[serde(default)]
    pub visible: Option<bool>,
    #[serde(default)]
    pub status: Option<Value>,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct AdminProductMutationCommand {
    pub subject: AdminCatalogSubject,
    pub product_id: Option<String>,
    pub spu_no: String,
    pub product_type: String,
    pub title: String,
    pub subtitle: Option<String>,
    pub description: Option<String>,
    pub category_ids: Vec<String>,
    pub brand: Option<String>,
    pub status: String,
    pub idempotency_key: String,
    pub request_id: String,
    pub requested_at: String,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct AdminSkuAttributeInput {
    pub attribute_id: String,
    pub attribute_value_id: Option<String>,
    pub custom_value: Option<String>,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct AdminSkuMutationCommand {
    pub subject: AdminCatalogSubject,
    pub sku_id: Option<String>,
    pub sku_no: String,
    pub product_id: String,
    pub title: String,
    pub barcode: Option<String>,
    pub image: Option<Value>,
    pub fulfillment_type: String,
    pub tax_category: Option<String>,
    pub sales_unit: Option<String>,
    pub default_price_amount: Option<String>,
    pub default_currency_code: Option<String>,
    pub status: String,
    pub attributes: Vec<AdminSkuAttributeInput>,
    pub idempotency_key: String,
    pub request_id: String,
    pub requested_at: String,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct AdminAttributeMutationCommand {
    pub subject: AdminCatalogSubject,
    pub attribute_no: String,
    pub name: String,
    pub value_type: String,
    pub scope: String,
    pub required: bool,
    pub searchable: bool,
    pub filterable: bool,
    pub status: String,
    pub idempotency_key: String,
    pub request_id: String,
    pub requested_at: String,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct AdminPriceListMutationCommand {
    pub subject: AdminCatalogSubject,
    pub price_list_no: String,
    pub currency_code: String,
    pub market_code: Option<String>,
    pub customer_segment: Option<String>,
    pub starts_at: Option<String>,
    pub ends_at: Option<String>,
    pub status: String,
    pub idempotency_key: String,
    pub request_id: String,
    pub requested_at: String,
}

pub trait AdminCatalogStore {
    fn list_categories<'a>(
        &'a self,
        query: ListAdminCatalogRecordsQuery,
    ) -> AdminCatalogFuture<'a, AdminCatalogCollection>;

    fn create_category<'a>(
        &'a self,
        command: AdminCategoryMutationCommand,
    ) -> AdminCatalogFuture<'a, AdminCatalogJsonRecord>;

    fn update_category<'a>(
        &'a self,
        command: AdminCategoryMutationCommand,
    ) -> AdminCatalogFuture<'a, AdminCatalogJsonRecord>;

    fn delete_category<'a>(
        &'a self,
        command: DeleteAdminCategoryCommand,
    ) -> AdminCatalogFuture<'a, bool>;

    fn initialize_category_seeds<'a>(
        &'a self,
        command: AdminCategorySeedInitializeCommand,
    ) -> AdminCatalogFuture<'a, Vec<AdminCategorySeedInitializeSummary>>;

    fn list_products<'a>(
        &'a self,
        query: ListAdminCatalogRecordsQuery,
    ) -> AdminCatalogFuture<'a, AdminCatalogCollection>;

    fn create_product<'a>(
        &'a self,
        command: AdminProductMutationCommand,
    ) -> AdminCatalogFuture<'a, AdminCatalogJsonRecord>;

    fn update_product<'a>(
        &'a self,
        command: AdminProductMutationCommand,
    ) -> AdminCatalogFuture<'a, AdminCatalogJsonRecord>;

    fn delete_product<'a>(
        &'a self,
        command: DeleteAdminProductCommand,
    ) -> AdminCatalogFuture<'a, bool>;

    fn list_skus<'a>(
        &'a self,
        query: ListAdminCatalogRecordsQuery,
    ) -> AdminCatalogFuture<'a, AdminCatalogCollection>;

    fn create_sku<'a>(
        &'a self,
        command: AdminSkuMutationCommand,
    ) -> AdminCatalogFuture<'a, AdminCatalogJsonRecord>;

    fn update_sku<'a>(
        &'a self,
        command: AdminSkuMutationCommand,
    ) -> AdminCatalogFuture<'a, AdminCatalogJsonRecord>;

    fn delete_sku<'a>(&'a self, command: DeleteAdminSkuCommand) -> AdminCatalogFuture<'a, bool>;

    fn list_attributes<'a>(
        &'a self,
        query: ListAdminCatalogRecordsQuery,
    ) -> AdminCatalogFuture<'a, AdminCatalogCollection>;

    fn create_attribute<'a>(
        &'a self,
        command: AdminAttributeMutationCommand,
    ) -> AdminCatalogFuture<'a, AdminCatalogJsonRecord>;

    fn list_category_attributes<'a>(
        &'a self,
        query: ListAdminCatalogRecordsQuery,
    ) -> AdminCatalogFuture<'a, AdminCatalogCollection>;

    fn create_category_attribute<'a>(
        &'a self,
        command: AdminCategoryAttributeMutationCommand,
    ) -> AdminCatalogFuture<'a, AdminCatalogJsonRecord>;

    fn update_category_attribute<'a>(
        &'a self,
        command: AdminCategoryAttributeMutationCommand,
    ) -> AdminCatalogFuture<'a, AdminCatalogJsonRecord>;

    fn delete_category_attribute<'a>(
        &'a self,
        command: DeleteAdminCategoryAttributeCommand,
    ) -> AdminCatalogFuture<'a, bool>;

    fn list_price_lists<'a>(
        &'a self,
        query: ListAdminCatalogRecordsQuery,
    ) -> AdminCatalogFuture<'a, AdminCatalogCollection>;

    fn create_price_list<'a>(
        &'a self,
        command: AdminPriceListMutationCommand,
    ) -> AdminCatalogFuture<'a, AdminCatalogJsonRecord>;
}
