//! Contract-completeness guard for the OpenAI-compatible ingress surface.
//!
//! Every operation the open-api contract publishes under `/v1/**` is dialled
//! by callers driving the generated SDK. A published path the classifier cannot
//! name is not "unsupported" to the caller — it is a 404 that names neither the
//! path nor the missing arm. The published surface and the classifier are
//! therefore one contract, and this test is the place that says so.
//!
//! It exists because the routing-consistency gate
//! (`tools/check-cloudrouter-ai-routing-consistency.mjs`) only evaluates
//! vendor-native namespaces: its check 7 derives its operation list from
//! `x-sdkwork-vendor-path-prefixes` and explicitly skips the `/v1` namespace.
//! The OpenAI-compatible surface therefore had no routability check at all, and
//! three published operations drifted into "mounted route, no classifier arm"
//! without any gate going red.

use axum::http::Method;
use std::collections::BTreeSet;
use std::path::Path;

use sdkwork_cloudrouter_router_service::application::{
    InvocationClassificationRequest, InvocationResourceClassifier, OpenAiResourceClassifier,
};

/// The open-api contract, resolved from this crate's manifest directory so the
/// test reads the authored authority rather than a copy.
fn contract_path() -> std::path::PathBuf {
    Path::new(env!("CARGO_MANIFEST_DIR"))
        .join("../..")
        .join("apis/open-api/cloudrouter/cloudrouter-open-api.openapi.json")
}

const HTTP_METHODS: &[&str] = &["get", "post", "put", "patch", "delete", "head", "options"];

/// Every `/v1/**` operation the contract publishes, as `"<METHOD> <path>"`.
fn published_openai_operations() -> BTreeSet<String> {
    let source = std::fs::read_to_string(contract_path()).unwrap_or_else(|error| {
        panic!(
            "read the open-api contract {} failed: {error}",
            contract_path().display()
        )
    });
    let document: serde_json::Value =
        serde_json::from_str(&source).expect("the open-api contract must be valid JSON");
    let paths = document
        .get("paths")
        .and_then(serde_json::Value::as_object)
        .expect("the open-api contract must declare paths");

    let mut operations = BTreeSet::new();
    for (path, item) in paths {
        if !(path == "/v1" || path.starts_with("/v1/")) {
            continue;
        }
        let Some(item) = item.as_object() else {
            continue;
        };
        for method in HTTP_METHODS {
            if item.contains_key(*method) {
                operations.insert(format!("{} {path}", method.to_ascii_uppercase()));
            }
        }
    }
    operations
}

/// Operations the contract publishes but the routing contract has *declared*
/// unroutable, with the reason. An entry here is a decision on record, not an
/// oversight — and the drift direction is enforced in both ways below:
/// a declared path that becomes classifiable fails until the entry is removed,
/// a declared path the contract no longer publishes fails until it is deleted.
///
/// It is deliberately empty: every `/v1/**` operation the contract publishes is
/// classifiable, so the ingress and the router agree on the whole published
/// surface. The three operations that used to sit here
/// (`GET /v1/models/{model}`, `GET /v1/audio/voices/{voice_id}`,
/// `POST /v1/realtime/client_secrets`) now classify as locally-answered free
/// endpoints and answer the `501` the contract declares.
const DECLARED_UNCLASSIFIABLE_OPERATIONS: &[(&str, &str)] = &[];

#[test]
fn every_published_openai_operation_is_classifiable_or_declared() {
    let declared: BTreeSet<&str> = DECLARED_UNCLASSIFIABLE_OPERATIONS
        .iter()
        .map(|(operation, _)| *operation)
        .collect();

    let mut unclassified = Vec::new();
    let mut newly_classifiable = Vec::new();

    for operation in published_openai_operations() {
        let (method, path) = operation
            .split_once(' ')
            .expect("operation is formatted as \"<METHOD> <path>\"");
        let method = Method::from_bytes(method.as_bytes()).expect("contract method is valid");
        let classified = OpenAiResourceClassifier
            .classify(&InvocationClassificationRequest::new(method, path))
            .is_ok();

        match (classified, declared.contains(operation.as_str())) {
            (true, true) => newly_classifiable.push(operation),
            (false, false) => unclassified.push(operation),
            _ => {}
        }
    }

    assert!(
        unclassified.is_empty(),
        "{} published /v1 operation(s) have no OpenAiResourceClassifier arm, so the \
         gateway answers 404 for a path the contract advertises. Add the arm, or \
         declare the operation in DECLARED_UNCLASSIFIABLE_OPERATIONS with a reason:\n{}",
        unclassified.len(),
        unclassified.join("\n")
    );

    assert!(
        newly_classifiable.is_empty(),
        "{} operation(s) are declared unclassifiable but now classify; delete the \
         stale exemption so the ledger cannot rot into a permanent excuse:\n{}",
        newly_classifiable.len(),
        newly_classifiable.join("\n")
    );
}

#[test]
fn every_declared_unclassifiable_operation_is_still_published() {
    let published = published_openai_operations();
    let stale: Vec<&str> = DECLARED_UNCLASSIFIABLE_OPERATIONS
        .iter()
        .map(|(operation, _)| *operation)
        .filter(|operation| !published.contains(*operation))
        .collect();

    assert!(
        stale.is_empty(),
        "{} declared-unclassifiable operation(s) are no longer published by the \
         contract; delete the entries:\n{}",
        stale.len(),
        stale.join("\n")
    );
}

#[test]
fn every_declared_unclassifiable_operation_carries_a_reason() {
    for (operation, reason) in DECLARED_UNCLASSIFIABLE_OPERATIONS {
        assert!(
            !reason.trim().is_empty(),
            "{operation} is declared unclassifiable with no reason; an exemption \
             without a reason is a permanent excuse"
        );
    }
}
