use serde_json::{json, Value};
use sha2::{Digest, Sha256};

pub(crate) fn stable_product_center_id(prefix: &str, parts: &[&str]) -> String {
    let mut hasher = Sha256::new();
    hasher.update(prefix.as_bytes());
    for part in parts {
        hasher.update([0]);
        hasher.update(part.as_bytes());
    }
    let digest = hasher.finalize();
    let mut suffix = String::with_capacity(32);
    for byte in &digest[..16] {
        suffix.push_str(&format!("{byte:02x}"));
    }
    format!("{prefix}-{suffix}")
}

pub(crate) fn sql_error_message(error: &sqlx::Error) -> String {
    error.to_string()
}

pub(crate) fn is_unique_constraint_error(error: &sqlx::Error) -> bool {
    let message = error.to_string();
    message.contains("UNIQUE constraint failed")
        || message.contains("duplicate key value")
        || message.contains("unique constraint")
}

/// Extracts canonical Drive URI from a MediaResource snapshot or drive-backed field.
pub(crate) fn drive_uri_from_resource(resource: &Value) -> Option<String> {
    resource
        .get("driveUri")
        .or_else(|| resource.get("drive_uri"))
        .or_else(|| resource.get("uri"))
        .and_then(Value::as_str)
        .map(str::trim)
        .filter(|value| !value.is_empty())
        .map(str::to_owned)
}

#[allow(dead_code)] // retained for the product-center asset projection contract
pub(crate) fn provider_asset_media_resource(kind: &str, uri: &str) -> Value {
    json!({
        "kind": kind,
        "source": "provider_asset",
        "uri": uri
    })
}
