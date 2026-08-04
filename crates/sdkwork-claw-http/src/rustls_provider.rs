//! Process-level rustls crypto provider installation.
//!
//! rustls cannot auto-select a crypto provider when both `ring` and `aws-lc-rs`
//! features are enabled in the workspace graph. The Agents runtime stack
//! (rama/codex via `sdkwork-api-agents-assembly`) enables `aws-lc-rs` while
//! Claw Router's own hyper-rustls clients enable `ring`; every binary that
//! builds a TLS client config then panics unless a default provider is
//! installed first. The installation is process-wide and idempotent, so any
//! host that reaches a Claw Router TLS client builder is covered.

use std::sync::Once;

/// Ensures a process-wide rustls crypto provider is installed.
///
/// Prefers aws-lc-rs (broader WebPKI signature support, same choice as the
/// Agents/Codex runtime) and keeps the first installed provider when an
/// embedding host already installed one.
pub fn ensure_rustls_crypto_provider() {
    static RUSTLS_PROVIDER_INIT: Once = Once::new();
    RUSTLS_PROVIDER_INIT.call_once(|| {
        let _ = rustls::crypto::aws_lc_rs::default_provider().install_default();
    });
}

#[cfg(test)]
mod tests {
    use super::ensure_rustls_crypto_provider;

    #[test]
    fn installs_a_process_wide_provider() {
        ensure_rustls_crypto_provider();
        ensure_rustls_crypto_provider();
        assert!(
            rustls::crypto::CryptoProvider::get_default().is_some(),
            "default rustls crypto provider must be installed"
        );
    }
}
