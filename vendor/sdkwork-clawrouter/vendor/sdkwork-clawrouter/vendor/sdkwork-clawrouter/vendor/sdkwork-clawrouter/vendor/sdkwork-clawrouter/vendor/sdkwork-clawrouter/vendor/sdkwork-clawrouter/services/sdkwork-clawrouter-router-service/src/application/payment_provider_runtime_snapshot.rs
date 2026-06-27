use std::collections::HashMap;
use std::future::Future;
use std::pin::Pin;
use std::sync::{Arc, RwLock};

use serde::Serialize;

use super::{
    PaymentProviderRuntimeAssemblyEvent, PaymentProviderRuntimeAssemblyReport,
    PaymentProviderRuntimeAssemblySummary,
};

pub type PaymentProviderRuntimeSnapshotFuture<'a, T> = Pin<Box<dyn Future<Output = T> + Send + 'a>>;

#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct PaymentProviderRuntimeSnapshot {
    pub environment: String,
    pub recorded_at: String,
    pub summary: PaymentProviderRuntimeAssemblySummary,
    pub events: Vec<PaymentProviderRuntimeAssemblyEvent>,
}

pub trait PaymentProviderRuntimeSnapshotStore: Send + Sync {
    fn save<'a>(
        &'a self,
        snapshot: PaymentProviderRuntimeSnapshot,
    ) -> PaymentProviderRuntimeSnapshotFuture<'a, PaymentProviderRuntimeSnapshot>;

    fn load_latest<'a>(
        &'a self,
        environment: &'a str,
    ) -> PaymentProviderRuntimeSnapshotFuture<'a, Option<PaymentProviderRuntimeSnapshot>>;
}

#[derive(Clone)]
pub struct PaymentProviderRuntimeSnapshotService<S>
where
    S: PaymentProviderRuntimeSnapshotStore,
{
    store: S,
}

impl<S> PaymentProviderRuntimeSnapshotService<S>
where
    S: PaymentProviderRuntimeSnapshotStore,
{
    pub fn new(store: S) -> Self {
        Self { store }
    }

    pub async fn record_report(
        &self,
        environment: &str,
        recorded_at: &str,
        report: &PaymentProviderRuntimeAssemblyReport,
    ) -> PaymentProviderRuntimeSnapshot {
        let snapshot = PaymentProviderRuntimeSnapshot {
            environment: normalize_environment(environment),
            recorded_at: recorded_at.trim().to_owned(),
            summary: report.summary(),
            events: report.events(),
        };
        self.store.save(snapshot).await
    }

    pub async fn load_latest(&self, environment: &str) -> Option<PaymentProviderRuntimeSnapshot> {
        self.store
            .load_latest(&normalize_environment(environment))
            .await
    }
}

#[derive(Clone, Default)]
pub struct InMemoryPaymentProviderRuntimeSnapshotStore {
    snapshots: Arc<RwLock<HashMap<String, PaymentProviderRuntimeSnapshot>>>,
}

impl PaymentProviderRuntimeSnapshotStore for InMemoryPaymentProviderRuntimeSnapshotStore {
    fn save<'a>(
        &'a self,
        snapshot: PaymentProviderRuntimeSnapshot,
    ) -> PaymentProviderRuntimeSnapshotFuture<'a, PaymentProviderRuntimeSnapshot> {
        Box::pin(async move {
            let snapshot = sanitize_snapshot(snapshot);
            self.snapshots
                .write()
                .expect("payment provider runtime snapshot store lock poisoned")
                .insert(snapshot.environment.clone(), snapshot.clone());
            snapshot
        })
    }

    fn load_latest<'a>(
        &'a self,
        environment: &'a str,
    ) -> PaymentProviderRuntimeSnapshotFuture<'a, Option<PaymentProviderRuntimeSnapshot>> {
        Box::pin(async move {
            self.snapshots
                .read()
                .expect("payment provider runtime snapshot store lock poisoned")
                .get(&normalize_environment(environment))
                .cloned()
        })
    }
}

fn sanitize_snapshot(
    mut snapshot: PaymentProviderRuntimeSnapshot,
) -> PaymentProviderRuntimeSnapshot {
    snapshot.environment = normalize_environment(&snapshot.environment);
    snapshot.recorded_at = snapshot.recorded_at.trim().to_owned();
    for event in &mut snapshot.events {
        if let Some(message) = &mut event.message {
            *message = redact_sensitive_diagnostic_text(message);
        }
    }
    snapshot
}

fn redact_sensitive_diagnostic_text(message: &str) -> String {
    message
        .split_whitespace()
        .map(|token| {
            if token.contains("secret://")
                || token.contains("vault://")
                || token.starts_with("sk_live")
                || token.starts_with("sk_test")
                || token.contains("plaintext-secret")
            {
                "<redacted>"
            } else {
                token
            }
        })
        .collect::<Vec<_>>()
        .join(" ")
}

fn normalize_environment(environment: &str) -> String {
    match environment.trim().to_ascii_lowercase().as_str() {
        "prod" | "production" | "live" => "production".to_owned(),
        "test" | "sandbox" => "sandbox".to_owned(),
        other => other.to_owned(),
    }
}
