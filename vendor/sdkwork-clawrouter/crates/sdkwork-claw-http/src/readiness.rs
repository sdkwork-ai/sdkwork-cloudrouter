use std::future::Future;
use std::pin::Pin;
use std::sync::Arc;

pub type ReadinessCheckFn =
    Arc<dyn Fn() -> Pin<Box<dyn Future<Output = bool> + Send>> + Send + Sync>;

pub fn combine_readiness_checks(
    checks: impl IntoIterator<Item = ReadinessCheckFn>,
) -> Option<ReadinessCheckFn> {
    let checks: Vec<ReadinessCheckFn> = checks.into_iter().collect();
    if checks.is_empty() {
        return None;
    }
    if checks.len() == 1 {
        return Some(Arc::clone(&checks[0]));
    }
    Some(Arc::new(move || {
        let checks = checks.clone();
        Box::pin(async move {
            for check in checks {
                if !(check)().await {
                    return false;
                }
            }
            true
        })
    }))
}
