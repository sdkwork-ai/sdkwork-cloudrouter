//! 异步面"入队/放行"两条不变量的源码契约。
//!
//! 异步创建只有在"之后一定有人定价扣费"时才能被接受。这两条不变量分别位于
//! 两处代码，任何一处被顺手改掉都会重新打开"接单但不收钱"的窗口；行为测试需要
//! 环境变量与完整路由装配，因此用源码契约先把它钉住。

const ROUTER: &str =
    include_str!("../../../crates/sdkwork-cloudrouter-edge-runtime/src/invocation_router.rs");
const PRICING: &str = include_str!("../src/application/invocation/pricing.rs");

#[test]
fn registration_is_gated_on_the_reconciliation_worker() {
    // The interceptor must be registered inside the worker-enabled branch, and
    // that branch must consult the worker config. Registering it for every
    // request that carries a store would enqueue tasks nothing settles.
    let anchor = ROUTER
        .find("if let Some(async_usage_store) = async_usage_store")
        .expect("pipeline must receive an optional async usage store");
    let gated = &ROUTER[anchor..];
    let registration = gated
        .find("AsyncUsageRegistrationInterceptor::new")
        .expect("registration interceptor must be registered");
    let config_read = gated
        .find("async_usage_worker_config_from_env")
        .expect("registration must consult the worker config");
    assert!(
        config_read < registration,
        "the worker-enabled check must precede the registration call"
    );
    let head = &gated[..registration];
    assert!(
        head.contains("if sdkwork_cloudrouter_router_service::application::async_usage_worker_config_from_env"),
        "registration must be nested inside the worker-enabled condition"
    );
}

#[test]
fn background_responses_are_only_accepted_with_reconciliation() {
    let anchor = PRICING
        .find("fn unmetered_background_response")
        .expect("background guard must exist");
    let guard = &PRICING[anchor..];
    let body = &guard[..guard.find("\n}\n").unwrap_or(guard.len())];
    assert!(
        body.contains("&& !async_usage_reconciliation_enabled()"),
        "background:true must be refused while reconciliation is disabled"
    );
    assert!(
        PRICING.contains("fn async_usage_reconciliation_enabled"),
        "the guard must read the deployment reconciliation flag"
    );
}
