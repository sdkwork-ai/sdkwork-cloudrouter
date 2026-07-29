use sdkwork_claw_config::{RuntimeTomlConfig, UpstreamCredentialSecurityConfig};

const ACTIVE_KEY: &str = "0123456789abcdef0123456789abcdef";
const PREVIOUS_KEY: &str = "abcdef0123456789abcdef0123456789";
const FINGERPRINT_KEY: &str = "fingerprint-0123456789abcdef0123456789";

#[test]
fn parses_key_ring_and_redacts_all_key_material() {
    let config = UpstreamCredentialSecurityConfig::from_optional_key_ring_payload(Some(
        key_ring_json().to_owned(),
    ))
    .unwrap()
    .unwrap();

    assert_eq!("2026-07", config.active_key_id());
    assert_eq!(ACTIVE_KEY, config.active_key());
    assert_eq!(FINGERPRINT_KEY, config.fingerprint_key());
    assert_eq!(1, config.decryption_keys().len());
    let debug = format!("{config:?}");
    assert!(debug.contains("2026-07"));
    assert!(debug.contains("2026-06"));
    assert!(!debug.contains(ACTIVE_KEY));
    assert!(!debug.contains(PREVIOUS_KEY));
    assert!(!debug.contains(FINGERPRINT_KEY));
}

#[test]
fn rejects_short_keys_duplicate_ids_and_unknown_fields() {
    let short = UpstreamCredentialSecurityConfig::from_optional_key_ring_payload(Some(
        r#"{"activeKeyId":"active","activeKey":"short","fingerprintKey":"also-short"}"#.to_owned(),
    ))
    .unwrap_err();
    assert!(short.contains("at least 32 bytes"));

    let duplicate = UpstreamCredentialSecurityConfig::from_optional_key_ring_payload(Some(
        format!(
            r#"{{"activeKeyId":"active","activeKey":"{ACTIVE_KEY}","fingerprintKey":"{FINGERPRINT_KEY}","decryptionKeys":[{{"keyId":"active","key":"{PREVIOUS_KEY}"}}]}}"#
        ),
    ))
    .unwrap_err();
    assert!(duplicate.contains("duplicate key id active"));

    let unknown = UpstreamCredentialSecurityConfig::from_optional_key_ring_payload(Some(format!(
        r#"{{"activeKeyId":"active","activeKey":"{ACTIVE_KEY}","fingerprintKey":"{FINGERPRINT_KEY}","legacy":true}}"#
    )))
    .unwrap_err();
    assert!(unknown.contains("unknown field"));
}

#[test]
fn rejects_oversized_key_material_before_derivation() {
    let oversized_payload = "x".repeat(UpstreamCredentialSecurityConfig::MAX_KEY_RING_BYTES + 1);
    let error =
        UpstreamCredentialSecurityConfig::from_optional_key_ring_payload(Some(oversized_payload))
            .unwrap_err();
    assert!(error.contains("must not exceed"));

    let oversized_key = "x".repeat(UpstreamCredentialSecurityConfig::MAX_KEY_BYTES + 1);
    let error = UpstreamCredentialSecurityConfig::from_optional_key_ring_payload(Some(format!(
        r#"{{"activeKeyId":"active","activeKey":"{oversized_key}","fingerprintKey":"{FINGERPRINT_KEY}"}}"#
    )))
    .unwrap_err();
    assert!(error.contains("activeKey must not exceed"));
}

#[test]
fn reads_key_ring_from_runtime_toml_secret_file() {
    let secret_path = unique_secret_path("upstream-credential-key-ring");
    std::fs::write(&secret_path, key_ring_json()).unwrap();
    let runtime = RuntimeTomlConfig::from_toml_str(&format!(
        r#"
[security]
upstream_credential_key_ring_file = "{}"
"#,
        secret_path.display().to_string().replace('\\', "/")
    ))
    .unwrap();

    let config = UpstreamCredentialSecurityConfig::from_env_or_runtime_toml(Some(&runtime))
        .unwrap()
        .unwrap();
    assert_eq!("2026-07", config.active_key_id());
    let _ = std::fs::remove_file(secret_path);
}

#[test]
fn bounds_key_ring_secret_file_reads() {
    let secret_path = unique_secret_path("oversized-upstream-credential-key-ring");
    std::fs::write(
        &secret_path,
        "x".repeat(UpstreamCredentialSecurityConfig::MAX_KEY_RING_BYTES + 1),
    )
    .unwrap();
    let runtime = RuntimeTomlConfig::from_toml_str(&format!(
        r#"
[security]
upstream_credential_key_ring_file = "{}"
"#,
        secret_path.display().to_string().replace('\\', "/")
    ))
    .unwrap();

    let error =
        UpstreamCredentialSecurityConfig::from_env_or_runtime_toml(Some(&runtime)).unwrap_err();
    assert!(error.contains("must not exceed"));
    let _ = std::fs::remove_file(secret_path);
}

fn key_ring_json() -> &'static str {
    r#"{
  "activeKeyId": "2026-07",
  "activeKey": "0123456789abcdef0123456789abcdef",
  "fingerprintKey": "fingerprint-0123456789abcdef0123456789",
  "decryptionKeys": [
    {
      "keyId": "2026-06",
      "key": "abcdef0123456789abcdef0123456789"
    }
  ]
}"#
}

fn unique_secret_path(name: &str) -> std::path::PathBuf {
    std::env::temp_dir().join(format!(
        "clawrouter-{name}-{}-{}.secret",
        std::process::id(),
        std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap()
            .as_nanos()
    ))
}
