const POSTGRES_ADMIN_AI_RESOURCE_STORE: &str = include_str!(
    "../../../../sdkwork-models/crates/sdkwork-models-catalog-repository-sqlx/src/postgres/admin_ai_resource_store.rs"
);
const POSTGRES_SCHEMA: &str = include_str!("../../../generated/schema/postgres/schema.sql");

fn compact_sql(value: &str) -> String {
    value.split_whitespace().collect::<Vec<_>>().join(" ")
}

fn postgres_table_definition(table_name: &str) -> &str {
    POSTGRES_SCHEMA
        .split(&format!("CREATE TABLE IF NOT EXISTS {table_name}"))
        .nth(1)
        .unwrap_or_else(|| panic!("generated Postgres schema must define {table_name}"))
        .split("CREATE ")
        .next()
        .unwrap_or_default()
}

#[test]
fn postgres_admin_ai_resource_status_mappers_match_int4_schema_columns() {
    for table_name in ["ai_resource", "ai_resource_group", "ai_resource_group_item"] {
        let table = compact_sql(postgres_table_definition(table_name));
        assert!(
            table.contains("status INTEGER NOT NULL DEFAULT 1"),
            "{table_name}.status must stay an INT4 lifecycle column"
        );
        assert!(
            table.contains("sort_order INTEGER"),
            "{table_name}.sort_order must stay an INT4 ordering column"
        );
    }

    assert!(
        !POSTGRES_ADMIN_AI_RESOURCE_STORE.contains("let status: i64 = row.try_get(\"status\")"),
        "Postgres admin AI resource read mappers must not decode INT4 status columns as i64"
    );
    assert!(
        !POSTGRES_ADMIN_AI_RESOURCE_STORE.contains("try_get::<i64, _>(\"status\")"),
        "Postgres admin AI resource read mappers must not explicitly decode status as i64"
    );
    assert!(
        POSTGRES_ADMIN_AI_RESOURCE_STORE
            .matches("let status: i32 = row.try_get(\"status\")")
            .count()
            >= 3,
        "resource, resource group, and group-resource mappers must decode status as i32"
    );
    assert!(
        POSTGRES_ADMIN_AI_RESOURCE_STORE.contains("fn status_label(status: i32) -> String"),
        "status_label must accept the INT4-compatible status type"
    );
    assert!(
        !POSTGRES_ADMIN_AI_RESOURCE_STORE
            .contains("sort_order: row.try_get(\"sort_order\").ok().flatten()"),
        "Postgres admin AI resource read mappers must not hide INT4 sort_order decode failures"
    );
    assert!(
        POSTGRES_ADMIN_AI_RESOURCE_STORE
            .matches("optional_int4_as_i64_cell(&row, \"sort_order\")?")
            .count()
            >= 4,
        "resource, resource group, group-resource, and member mappers must decode INT4 sort_order explicitly"
    );
}
