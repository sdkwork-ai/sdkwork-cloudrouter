use std::path::PathBuf;

#[test]
fn business_domain_crates_follow_the_standard_module_layout() {
    let workspace = PathBuf::from(env!("CARGO_MANIFEST_DIR"))
        .parent()
        .expect("runtime crate should live under native-rust/commerce")
        .to_path_buf();
    let business_crates: [&str; 0] = [];
    let sibling_capability_crates = [
        (
            "../../sdkwork-shop/crates/sdkwork-commerce-shop-service",
            "sdkwork-commerce-shop-service",
        ),
        (
            "../../sdkwork-merchandise/crates/sdkwork-commerce-merchandise-service",
            "sdkwork-commerce-merchandise-service",
        ),
        (
            "../../sdkwork-inventory/crates/sdkwork-commerce-inventory-service",
            "sdkwork-commerce-inventory-service",
        ),
        (
            "../../sdkwork-order/crates/sdkwork-commerce-order-service",
            "sdkwork-commerce-order-service",
        ),
        (
            "../../sdkwork-payment/crates/sdkwork-commerce-payment-service",
            "sdkwork-commerce-payment-service",
        ),
        (
            "../../sdkwork-account/crates/sdkwork-commerce-account-service",
            "sdkwork-commerce-account-service",
        ),
        (
            "../../sdkwork-membership/crates/sdkwork-commerce-membership-service",
            "sdkwork-commerce-membership-service",
        ),
        (
            "../../sdkwork-promotion/crates/sdkwork-commerce-promotion-service",
            "sdkwork-commerce-promotion-service",
        ),
        (
            "../../sdkwork-invoice/crates/sdkwork-commerce-invoice-service",
            "sdkwork-commerce-invoice-service",
        ),
    ];
    let required_modules = [
        "src/domain/mod.rs",
        "src/commands/mod.rs",
        "src/queries/mod.rs",
        "src/ports/mod.rs",
        "src/service/mod.rs",
        "src/validation/mod.rs",
    ];

    for crate_name in business_crates {
        for module_path in required_modules {
            let path = workspace.join(crate_name).join(module_path);
            assert!(
                path.is_file(),
                "business crate {crate_name} is missing standard module {module_path}",
            );
        }
    }

    for (relative_path, crate_name) in sibling_capability_crates {
        for module_path in required_modules {
            let path = workspace.join(relative_path).join(module_path);
            assert!(
                path.is_file(),
                "sibling capability crate {crate_name} is missing standard module {module_path}",
            );
        }
    }
}
