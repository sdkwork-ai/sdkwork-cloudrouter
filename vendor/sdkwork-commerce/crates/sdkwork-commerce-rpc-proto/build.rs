use std::path::PathBuf;

const COMMERCE_PROTO_FILES: &[&str] = &[
    "sdkwork/commerce/app/v3/wallet_service.proto",
    "sdkwork/commerce/app/v3/checkout_service.proto",
    "sdkwork/commerce/backend/v3/payment_admin_service.proto",
    "sdkwork/commerce/backend/v3/commerce_report_service.proto",
];

fn main() -> Result<(), Box<dyn std::error::Error>> {
    std::env::set_var("PROTOC", protoc_bin_vendored::protoc_bin_path()?);

    let manifest_dir = PathBuf::from(std::env::var("CARGO_MANIFEST_DIR")?);
    let workspace_root = manifest_dir.join("../..");
    let commerce_proto_root =
        workspace_root.join("packages/common/commerce/sdkwork-commerce-rpc-contracts/proto");
    let common_proto_root =
        workspace_root.join("../sdkwork-appbase/packages/common/rpc/sdkwork-rpc-contracts/proto");

    for root in [&commerce_proto_root, &common_proto_root] {
        if !root.is_dir() {
            return Err(format!("required proto root is missing: {}", root.display()).into());
        }
    }

    let proto_files: Vec<PathBuf> = COMMERCE_PROTO_FILES
        .iter()
        .map(|relative| commerce_proto_root.join(relative))
        .collect();

    for proto_file in &proto_files {
        if !proto_file.is_file() {
            return Err(format!("required proto file is missing: {}", proto_file.display()).into());
        }
        println!("cargo:rerun-if-changed={}", proto_file.display());
    }

    println!("cargo:rerun-if-changed={}", common_proto_root.display());

    let out_dir = PathBuf::from(std::env::var("OUT_DIR")?);
    let proto_file_refs: Vec<_> = proto_files
        .iter()
        .map(|path| path.to_string_lossy().into_owned())
        .collect();
    let include_roots = [
        commerce_proto_root.to_string_lossy().into_owned(),
        common_proto_root.to_string_lossy().into_owned(),
    ];

    tonic_prost_build::configure()
        .build_server(true)
        .build_client(true)
        .file_descriptor_set_path(out_dir.join("commerce_rpc_descriptor.bin"))
        .compile_protos(&proto_file_refs, &include_roots)?;

    Ok(())
}
