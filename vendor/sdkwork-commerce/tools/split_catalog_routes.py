#!/usr/bin/env python3
"""Split merchandise catalog_routes.rs into catalog_store + backend_catalog_router."""

from __future__ import annotations

from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
MERCH_ROUTER = (
    ROOT.parent
    / "sdkwork-merchandise/crates/sdkwork-routes-merchandise-app-api/src"
)
SOURCE = MERCH_ROUTER / "catalog_routes.rs"
lines = SOURCE.read_text(encoding="utf-8").splitlines(keepends=True)


def slice_lines(start: int, end: int) -> str:
    return "".join(lines[start - 1 : end])


store_header = """//! Shared catalog store trait, HTTP DTOs, and response mappers.

"""

store_body = slice_lines(1, 1132) + slice_lines(2516, len(lines))
(MERCH_ROUTER / "catalog_store.rs").write_text(store_header + store_body, encoding="utf-8")

backend_header = """//! Backend admin catalog HTTP routes (owned by merchandise).

use std::sync::Arc;

use axum::extract::{Extension, Path, Query, State};
use axum::http::StatusCode;
use axum::response::{IntoResponse, Response};
use axum::routing::{get, patch, post};
use axum::{Json, Router};
use sdkwork_commerce_merchandise_service::{
    ArchiveSpuCommand, AttributeListQuery, CategoryAttributeListQuery, CategoryListQuery,
    CategoryRetrieveQuery, CreateAttributeCommand, CreateCategoryAttributeCommand,
    CreateCategoryCommand, CreatePriceListCommand, CreateProductSkuCommand,
    CreateProductSpuCommand, DeleteCategoryAttributeCommand, DeleteCategoryCommand,
    DeleteProductSkuCommand, DeleteProductSpuCommand, PriceListListQuery, ProductSkuListQuery,
    ProductSpuListQuery, ProductSpuRetrieveQuery, PublishSpuCommand, UpdateCategoryAttributeCommand,
    UpdateCategoryCommand, UpdatePriceListCommand, UpdateProductSkuCommand, UpdateProductSpuCommand,
};
use sdkwork_commerce_merchandise_repository_sqlx::{
    PostgresCommerceCatalogStore, SqliteCommerceCatalogStore,
};
use sdkwork_iam_context_service::IamAppContext;
use sqlx::{PgPool, SqlitePool};

use crate::catalog_store::{
    catalog_system_response, map_attribute, map_category, map_category_attribute, map_price_list,
    map_sku, map_spu, not_found_response, unauthorized_response, validation_response,
    AttributeQueryParams, CatalogApiResult, CatalogState, CategoryAttributeQueryParams,
    CategoryQueryParams, CommerceCatalogStore, CreateAttributeBody, CreateCategoryAttributeBody,
    CreateCategoryBody, CreatePriceListBody, CreateSkuBody, CreateSpuBody, PriceListQueryParams,
    SkuListQueryParams, SpuListQueryParams, UpdateCategoryAttributeBody, UpdateCategoryBody,
    UpdatePriceListBody, UpdateSkuBody, UpdateSpuBody,
};
use crate::subject::app_runtime_subject_from_extension;

"""

backend_body = slice_lines(1183, 1256) + slice_lines(1715, 2514)
(MERCH_ROUTER / "backend_catalog_router.rs").write_text(
    backend_header + backend_body, encoding="utf-8"
)

app_header = """//! App browse/open catalog HTTP routes (owned by catalog capability).

use std::sync::Arc;

use axum::extract::{Extension, Path, Query, State};
use axum::response::{IntoResponse, Response};
use axum::routing::{get, patch, post};
use axum::{Json, Router};
use sdkwork_commerce_merchandise_service::{
    AddCartItemCommand, AddressListQuery, AttributeListQuery, CartRetrieveQuery, CategoryListQuery,
    CategoryRetrieveQuery, CreateAddressCommand, DeleteAddressCommand, ProductSkuRetrieveQuery,
    ProductSpuListQuery, ProductSpuRetrieveQuery, RemoveCartItemCommand, SetDefaultAddressCommand,
    SkuPriceRetrieveQuery, UpdateAddressCommand, UpdateCartItemCommand,
};
use sdkwork_commerce_merchandise_repository_sqlx::{
    PostgresCommerceCatalogStore, SqliteCommerceCatalogStore,
};
use sdkwork_iam_context_service::IamAppContext;
use sdkwork_routes_merchandise_app_api::{
    catalog_system_response, map_address, map_attribute, map_cart_item, map_category,
    map_price_list_item, map_sku, map_spu, not_found_response, unauthorized_response,
    validation_response, AddCartItemBody, AttributeQueryParams, CatalogApiResult, CatalogState,
    CategoryQueryParams, CommerceCatalogStore, CreateAddressBody, SpuListQueryParams,
    UpdateAddressBody, UpdateCartItemBody,
};
use sqlx::{PgPool, SqlitePool};

use crate::subject::app_runtime_subject_from_extension;

"""

app_body = slice_lines(1134, 1181) + slice_lines(1258, 1713)
CATALOG_ROUTER = (
    ROOT.parent / "sdkwork-catalog/crates/sdkwork-routes-catalog-app-api/src"
)
(CATALOG_ROUTER / "app_catalog_router.rs").write_text(app_header + app_body, encoding="utf-8")

print("wrote catalog_store.rs, backend_catalog_router.rs, app_catalog_router.rs")
