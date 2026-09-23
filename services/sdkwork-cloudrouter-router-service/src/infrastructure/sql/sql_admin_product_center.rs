use serde_json::{json, Value};

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
