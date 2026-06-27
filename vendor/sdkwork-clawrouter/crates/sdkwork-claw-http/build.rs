use std::env;
use std::fs;
use std::path::{Path, PathBuf};
use std::process::Command;

fn main() {
    let manifest_dir = PathBuf::from(
        env::var("CARGO_MANIFEST_DIR")
            .expect("CARGO_MANIFEST_DIR must be available during cargo build"),
    );
    let workspace_root = manifest_dir
        .parent()
        .and_then(Path::parent)
        .expect("sdkwork-claw-http must live under crates/")
        .to_path_buf();
    let out_dir = PathBuf::from(env::var("OUT_DIR").expect("OUT_DIR must be set by Cargo"));
    let gateway_output_path = out_dir.join("gateway-openapi.json");

    println!("cargo:rerun-if-env-changed=PYTHON");
    println!("cargo:rerun-if-env-changed=SDKWORK_CLAW_HTTP_OPENAPI_BUILD_MODE");
    for changed_path in [
        workspace_root
            .join("tools")
            .join("clawrouter_gateway_openapi_generator.py"),
        workspace_root
            .join("tools")
            .join("clawrouter_openapi_generator.py"),
        workspace_root
            .join("tools")
            .join("api_contract_manifest.py"),
        workspace_root
            .join("docs")
            .join("schema-registry")
            .join("frontend-field-contracts.yaml"),
        workspace_root
            .join("docs")
            .join("schema-registry")
            .join("frontend-field-contracts")
            .join("index.yaml"),
        workspace_root
            .join("docs")
            .join("schema-registry")
            .join("frontend-field-contracts")
            .join("operations"),
        workspace_root
            .join("docs")
            .join("schema-registry")
            .join("frontend-field-contracts")
            .join("models"),
        workspace_root
            .join("docs")
            .join("schema-registry")
            .join("frontend-field-contracts")
            .join("routes"),
        workspace_root
            .join("docs")
            .join("schema-registry")
            .join("frontend-field-contracts")
            .join("shared"),
        workspace_root
            .join("generated")
            .join("api")
            .join("api-contract-manifest.json"),
        workspace_root
            .join("generated")
            .join("openapi")
            .join("schema-components.yaml"),
        workspace_root
            .join("services")
            .join("sdkwork-clawrouter-router-service")
            .join("src")
            .join("api")
            .join("openai_contract.rs"),
    ] {
        println!("cargo:rerun-if-changed={}", changed_path.display());
    }

    let build_mode =
        env::var("SDKWORK_CLAW_HTTP_OPENAPI_BUILD_MODE").unwrap_or_else(|_| "generate".to_owned());
    if build_mode == "copy" {
        copy_openapi_if_changed(
            workspace_root
                .join("sdks")
                .join("clawrouter-open-sdk")
                .join("openapi")
                .join("clawrouter-open-sdk.openapi.json"),
            &gateway_output_path,
        );
        copy_openapi_if_changed(
            workspace_root
                .join("sdks")
                .join("clawrouter-app-sdk")
                .join("openapi")
                .join("clawrouter-app-sdk.openapi.json"),
            &out_dir.join("clawrouter-app-openapi.json"),
        );
        copy_openapi_if_changed(
            workspace_root
                .join("sdks")
                .join("clawrouter-backend-sdk")
                .join("openapi")
                .join("clawrouter-backend-sdk.openapi.json"),
            &out_dir.join("clawrouter-backend-openapi.json"),
        );
        validate_required_schemas(&out_dir);
        return;
    }
    if build_mode != "generate" {
        panic!("unsupported SDKWORK_CLAW_HTTP_OPENAPI_BUILD_MODE: {build_mode}");
    }

    let python = env::var("PYTHON").unwrap_or_else(|_| "python".to_owned());
    let gateway_status = Command::new(&python)
        .current_dir(&workspace_root)
        .arg("-B")
        .arg("-m")
        .arg("tools.clawrouter_gateway_openapi_generator")
        .arg("--root")
        .arg(&workspace_root)
        .arg("--output")
        .arg(&gateway_output_path)
        .status()
        .unwrap_or_else(|error| panic!("failed to run {python} OpenAPI generator: {error}"));

    if !gateway_status.success() {
        panic!("gateway OpenAPI schema generation failed with status {gateway_status}");
    }

    let app_backend_status = Command::new(&python)
        .current_dir(&workspace_root)
        .arg("-B")
        .arg("-m")
        .arg("tools.clawrouter_openapi_generator")
        .arg("--root")
        .arg(&workspace_root)
        .arg("--output-dir")
        .arg(&out_dir)
        .status()
        .unwrap_or_else(|error| {
            panic!("failed to run {python} app/backend OpenAPI generator: {error}")
        });

    if !app_backend_status.success() {
        panic!("app/backend OpenAPI schema generation failed with status {app_backend_status}");
    }

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
        "clawrouter-app-openapi.json",
        "clawrouter-backend-openapi.json",
    ] {
        let required_path = out_dir.join(required_schema);
        if !required_path.is_file() {
            panic!(
                "OpenAPI schema generation did not produce required schema: {}",
                required_path.display()
            );
        }
    }
}
