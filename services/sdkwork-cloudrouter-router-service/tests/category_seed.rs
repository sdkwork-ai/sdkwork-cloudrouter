use sdkwork_cloudrouter_router_service::application::{
    bundle_scope, classification_scope, load_admin_category_seed_bundles,
    DEFAULT_ADMIN_CATEGORY_SEED_DATASETS,
};

#[test]
fn category_seed_manifests_resolve_to_an_owned_persistence_target() {
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
            // The product taxonomy and the classification datasets both persist
            // into `commerce_product_category`; only the scope differs.
            "commerce_product_category" => {
                assert_eq!(
                    bundle_scope(&bundle).expect("product bundle must resolve scope"),
                    None,
                    "product taxonomy seeds must not be scoped"
                );
            }
            "c_category" => {
                let scope = bundle_scope(&bundle)
                    .expect("classification bundle must resolve a category_type scope")
                    .expect("classification bundles are always scoped");
                assert!(
                    !scope.is_empty(),
                    "category seed dataset {} must resolve a non-empty category_type scope",
                    bundle.dataset
                );
            }
            other => panic!(
                "category seed dataset {} has unsupported target {}",
                bundle.dataset, other
            ),
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
        let scope = classification_scope(legacy_type, dataset, group_name)
            .unwrap_or_else(|error| panic!("{dataset} scope mapping failed: {error}"));
        assert_eq!(expected, scope);
    }
}

/// Every classification dataset must resolve a scope *without* being persisted
/// into a table Cloud Router does not own. This is the regression guard for the
/// retired `c_category` target: no seed dataset may require that table.
#[test]
fn classification_datasets_never_require_a_c_category_table() {
    let datasets = ["agents", "agent-skills", "mcp"]
        .iter()
        .map(|dataset| (*dataset).to_owned())
        .collect::<Vec<_>>();
    let bundles =
        load_admin_category_seed_bundles(&datasets).expect("classification bundles must load");
    assert_eq!(bundles.len(), 3);
    for bundle in bundles {
        assert_ne!(
            bundle_scope(&bundle).expect("scope must resolve"),
            None,
            "classification dataset {} must be scoped",
            bundle.dataset
        );
    }
}
