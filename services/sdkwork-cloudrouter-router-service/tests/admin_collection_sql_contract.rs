//! Static SQL/wire contract tests for the admin AI capability collection store.
//!
//! These tests pin the invariants that a live PostgreSQL round-trip cannot
//! express cheaply in CI: every statement is workspace-scoped in SQL, the four
//! collection tables are the only tables touched, publish writes an immutable
//! snapshot, and delete leaves a reusable tombstoned key.

const POSTGRES_ADMIN_COLLECTION_STORE: &str =
    include_str!("../src/infrastructure/sql/postgres/admin_collection_store.rs");
const ADMIN_COLLECTION_API: &str = include_str!("../src/api/admin_collection.rs");
const ADMIN_COLLECTION_PORT: &str = include_str!("../src/ports/admin_collection_store.rs");

#[test]
fn collection_store_targets_only_the_collection_plane() {
    let source = POSTGRES_ADMIN_COLLECTION_STORE;
    for table in [
        "ai_collection_category",
        "ai_collection_item",
        "ai_collection_release",
        "ai_collection",
    ] {
        assert!(
            source.contains(table),
            "the collection store must use {table}"
        );
    }
    // Capability records stay owned by the sibling modules; the store must not
    // reach into their tables.
    for foreign_table in [
        "ai_skill_package",
        "ai_mcp_server",
        "ai_agent ",
        "ai_plugin ",
    ] {
        assert!(
            !source.contains(foreign_table),
            "the collection store must not read sibling capability table {foreign_table}"
        );
    }
}

#[test]
fn collection_statements_are_static_and_workspace_scoped() {
    let source = POSTGRES_ADMIN_COLLECTION_STORE;
    assert!(
        !source.contains("format!(\"SELECT") && !source.contains("format!(\"UPDATE"),
        "collection SQL must stay a static literal so the statement shape is auditable"
    );
    // Every category/collection query carries the tenant predicate; the org
    // predicate allows the tenant-wide (organization 0) fallback.
    for predicate in [
        "c.tenant_id = $1",
        "c.tenant_id = $2",
        "col.tenant_id = c.tenant_id",
        "i.tenant_id = $2",
        "r.collection_id = $1",
        "tenant_id = $1",
        "tenant_id = $2",
    ] {
        assert!(
            source.contains(predicate),
            "collection SQL must include workspace predicate {predicate}"
        );
    }
    assert!(source.contains("(c.organization_id = $2 OR c.organization_id = 0)"));
}

#[test]
fn collection_items_store_the_typed_kind_and_json_config() {
    let source = POSTGRES_ADMIN_COLLECTION_STORE;
    assert!(source.contains("collection_kind"));
    assert!(source.contains("capability_type"));
    assert!(source.contains("$12::jsonb"));
    assert!(
        source.contains("ck_ai_collection_item_kind_matches") || source.contains("only contain")
    );
    assert!(source.contains("validate_items_for_kind"));
}

#[test]
fn publish_writes_an_immutable_release_snapshot() {
    let source = POSTGRES_ADMIN_COLLECTION_STORE;
    assert!(source.contains("ai_collection_release"));
    assert!(source.contains("item_snapshot"));
    assert!(source.contains("release_no"));
    assert!(source.contains("MAX(release_no)"));
    assert!(source.contains(
        "a collection must contain at least one enabled capability before it can be published"
    ));
    assert!(source.contains("a disabled collection cannot be published"));
    // The release snapshot must contain only enabled items.
    assert!(source.contains("let publishable_items = items.iter().filter(|item| item.enabled)"));
    assert!(source.contains(".bind(i64::try_from(publishable_items.len()).unwrap_or(i64::MAX))"));
}

#[test]
fn content_edits_return_a_published_collection_to_draft() {
    let source = POSTGRES_ADMIN_COLLECTION_STORE;
    assert!(source.contains("publish_status = 'draft'"));
    assert!(source
        .contains("let reset_to_draft = content_changed && locked.publish_status != \"draft\""));
    assert!(source
        .contains("publish_status = CASE WHEN $15::boolean THEN 'draft' ELSE publish_status END"));
    assert!(source.contains("let content_changed ="));
}

#[test]
fn release_history_requires_a_visible_collection() {
    let source = POSTGRES_ADMIN_COLLECTION_STORE;
    assert!(source.contains("failed to check collection existence"));
    assert!(source.contains("collection was not found"));
}

#[test]
fn category_filing_locks_the_category_against_concurrent_delete() {
    let source = POSTGRES_ADMIN_COLLECTION_STORE;
    // `ensure_category_kind` takes a share lock, while delete takes FOR UPDATE
    // on the same category row, so a collection cannot be filed into a category
    // that is being deleted in a concurrent transaction.
    assert!(source.contains("failed to load collection category kind"));
    assert!(source.contains("FOR SHARE"));
    assert!(source.contains("async fn load_category_for_update"));
}

#[test]
fn category_tombstone_fits_the_code_check() {
    let source = POSTGRES_ADMIN_COLLECTION_STORE;
    // The soft-delete tombstone must fit VARCHAR(128) and the category-code
    // check must admit it, otherwise deleting a category fails at runtime.
    assert!(source.contains("category_code = LEFT(category_code, 100) || $4 || id::text"));
    assert!(source.contains("collection_key = LEFT(collection_key, 100) || $4 || id::text"));
    let migration =
        include_str!("../../../database/migrations/postgres/0055_ai_capability_collections.up.sql");
    assert!(migration.contains("ck_ai_collection_category_code"));
    assert!(migration.contains("#deleted-[0-9]{1,19}"));
    assert!(migration.contains("VARCHAR(128)"));
}

#[test]
fn collection_search_covers_tags() {
    let source = POSTGRES_ADMIN_COLLECTION_STORE;
    assert!(source.contains("OR LOWER(c.tags::text) LIKE '%' || LOWER($8::text) || '%'"));
}

#[test]
fn collection_delete_tombstones_the_key_for_reuse() {
    let source = POSTGRES_ADMIN_COLLECTION_STORE;
    assert!(source.contains("const DELETED_TAG: &str = \"#deleted-\""));
    assert!(source.contains("collection_key = LEFT(collection_key, 100) || $4 || id::text"));
    assert!(source.contains("category_code = LEFT(category_code, 100) || $4 || id::text"));
    assert!(source.contains("deleted_at = CURRENT_TIMESTAMP"));
}

#[test]
fn system_categories_are_read_only_and_initialized_per_workspace() {
    let source = POSTGRES_ADMIN_COLLECTION_STORE;
    assert!(source.contains("SYSTEM_CATEGORIES"));
    assert!(source.contains("{\"system\":true}"));
    assert!(source.contains(
        "ON CONFLICT (tenant_id, organization_id, collection_kind, category_code) DO NOTHING"
    ));
    assert!(source.contains("system collection categories cannot be modified"));
    assert!(source.contains("system collection categories cannot be deleted"));
}

#[test]
fn collection_api_registers_every_contract_route() {
    let source = ADMIN_COLLECTION_API;
    for route in [
        "/backend/v3/api/ai/collection_categories",
        "/backend/v3/api/ai/collection_categories/defaults",
        "/backend/v3/api/ai/collection_categories/{category_id}",
        "/backend/v3/api/ai/collections",
        "/backend/v3/api/ai/collections/{collection_id}",
        "/backend/v3/api/ai/collections/{collection_id}/items",
        "/backend/v3/api/ai/collections/{collection_id}/status",
        "/backend/v3/api/ai/collections/{collection_id}/releases",
    ] {
        assert!(source.contains(route), "collection API must mount {route}");
    }
    assert!(source.contains("json_created_response"));
    assert!(source.contains("no_content_response"));
    assert!(source.contains("problem_from_wire_code(\"4040\""));
    assert!(source.contains("problem_from_wire_code(\"4090\""));
}

#[test]
fn collection_api_validates_kind_item_and_relationship_rules() {
    let source = ADMIN_COLLECTION_API;
    assert!(source.contains("VALID_COLLECTION_KINDS"));
    assert!(source.contains("VALID_CAPABILITY_TYPES"));
    assert!(source.contains("items must contain at most"));
    assert!(source.contains("duplicates capability"));
    assert!(source.contains("can only contain"));
    assert!(source.contains("deserialize_nullable_id"));
    assert!(source.contains("collection update fields are required"));
    assert!(source.contains("collection category update fields are required"));
}

#[test]
fn collection_port_documents_ownership_and_int64_wire_shape() {
    let source = ADMIN_COLLECTION_PORT;
    assert!(source.contains("capability key"));
    assert!(source.to_lowercase().contains("exact decimal string"));
    assert!(source.contains("AdminCollectionStore"));
    for method in [
        "list_categories",
        "initialize_categories",
        "create_category",
        "update_category",
        "delete_category",
        "list_collections",
        "get_collection",
        "create_collection",
        "update_collection",
        "delete_collection",
        "replace_collection_items",
        "update_collection_status",
        "list_collection_releases",
    ] {
        assert!(source.contains(method), "port must expose {method}");
    }
}
