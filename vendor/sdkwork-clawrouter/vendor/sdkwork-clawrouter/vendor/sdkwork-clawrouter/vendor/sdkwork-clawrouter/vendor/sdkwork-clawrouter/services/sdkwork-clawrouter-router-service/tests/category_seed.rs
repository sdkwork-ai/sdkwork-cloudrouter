use sdkwork_clawrouter_router_service::application::{
    c_category_type_scope, load_admin_category_seed_bundles, DEFAULT_ADMIN_CATEGORY_SEED_DATASETS,
};

#[test]
fn category_seed_manifests_target_v41_tables() {
    let datasets = DEFAULT_ADMIN_CATEGORY_SEED_DATASETS
        .iter()
        .map(|dataset| (*dataset).to_owned())
        .collect::<Vec<_>>();
    let bundles =
        load_admin_category_seed_bundles(&datasets).expect("category seed bundles must load");

    for bundle in bundles {
        assert_eq!(bundle.schema_version, 1);
        assert_eq!(bundle.kind, "sdkwork.category_seed");
        match bundle.target.as_str() {
            "commerce_product_category" | "c_category" => {}
            other => panic!(
                "category seed dataset {} has unsupported target {}",
                bundle.dataset, other
            ),
        }
        if bundle.target == "c_category" {
            let legacy_type = bundle
                .category_type
                .expect("c_category seed requires categoryType");
            let scope = c_category_type_scope(
                legacy_type,
                bundle.dataset.as_str(),
                bundle.group_name.as_deref(),
            )
            .expect("c_category seed scope must resolve");
            assert!(
                !scope.is_empty(),
                "category seed dataset {} must resolve a non-empty category_type scope",
                bundle.dataset
            );
        }
    }
}

#[test]
fn category_seed_scope_mapping_matches_dataset_contract() {
    let expectations = [
        (
            "agent-skills",
            19,
            Some("category-seed:agent-skills"),
            "skill_market",
        ),
        ("agents", 30, Some("category-seed:agents"), "agent"),
        ("mcp", 40, Some("category-seed:mcp"), "mcp"),
    ];
    for (dataset, legacy_type, group_name, expected) in expectations {
        let scope = c_category_type_scope(legacy_type, dataset, group_name)
            .unwrap_or_else(|error| panic!("{dataset} scope mapping failed: {error}"));
        assert_eq!(expected, scope);
    }
}
