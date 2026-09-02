use std::env;
use std::fs;
use std::path::{Path, PathBuf};

fn main() {
    let manifest_dir = PathBuf::from(
        env::var("CARGO_MANIFEST_DIR")
            .expect("CARGO_MANIFEST_DIR must be available during cargo build"),
    );
    let workspace_root = manifest_dir
        .parent()
        .and_then(Path::parent)
        .expect("sdkwork-cloudrouter-http must live under crates/")
        .to_path_buf();
    let out_dir = PathBuf::from(env::var("OUT_DIR").expect("OUT_DIR must be set by Cargo"));
    let gateway_output_path = out_dir.join("gateway-openapi.json");

    // Embedded OpenAPI documents come from git-tracked contract artifacts.
    // Regeneration and freshness checks are explicit contract tooling steps
    // (tools/cloudrouter_*_openapi_generator.py, scripts/verify-cloud-router-application.mjs),
    // never part of `cargo build`, so the Rust build has no Python dependency.
    for changed_path in [
        workspace_root
            .join("sdks")
            .join("cloudrouter-open-sdk")
            .join("openapi")
            .join("cloudrouter-open-sdk.openapi.json"),
        workspace_root
            .join("sdks")
            .join("cloudrouter-app-sdk")
            .join("openapi")
            .join("cloudrouter-app-sdk.openapi.json"),
        workspace_root
            .join("sdks")
            .join("cloudrouter-backend-sdk")
            .join("openapi")
            .join("cloudrouter-backend-sdk.openapi.json"),
    ] {
        println!("cargo:rerun-if-changed={}", changed_path.display());
    }

    copy_openapi_if_changed(
        workspace_root
            .join("sdks")
            .join("cloudrouter-open-sdk")
            .join("openapi")
            .join("cloudrouter-open-sdk.openapi.json"),
        &gateway_output_path,
    );
    copy_openapi_if_changed(
        workspace_root
            .join("sdks")
            .join("cloudrouter-app-sdk")
            .join("openapi")
            .join("cloudrouter-app-sdk.openapi.json"),
        &out_dir.join("cloudrouter-app-openapi.json"),
    );
    copy_openapi_if_changed(
        workspace_root
            .join("sdks")
            .join("cloudrouter-backend-sdk")
            .join("openapi")
            .join("cloudrouter-backend-sdk.openapi.json"),
        &out_dir.join("cloudrouter-backend-openapi.json"),
    );
    validate_required_schemas(&out_dir);
}

fn copy_openapi_if_changed(source: PathBuf, target: &Path) {
    let source_bytes = fs::read(&source).unwrap_or_else(|error| {
        panic!(
            "failed to read OpenAPI source {}: {error}",
            source.display()
        )
    });
    if let Ok(existing_bytes) = fs::read(target) {
        if existing_bytes == source_bytes {
            return;
        }
    }
    if let Some(parent) = target.parent() {
        fs::create_dir_all(parent).unwrap_or_else(|error| {
            panic!(
                "failed to create OpenAPI output directory {}: {error}",
                parent.display()
            )
        });
    }
    fs::write(target, source_bytes).unwrap_or_else(|error| {
        panic!(
            "failed to write OpenAPI output {}: {error}",
            target.display()
        )
    });
}

fn validate_required_schemas(out_dir: &Path) {
    for required_schema in [
        "gateway-openapi.json",
        "cloudrouter-app-openapi.json",
        "cloudrouter-backend-openapi.json",
    ] {
        let required_path = out_dir.join(required_schema);
        if !required_path.is_file() {
            panic!(
                "OpenAPI contract artifacts missing required schema: {}",
                required_path.display()
            );
        }
    }
}
