mod account;
mod account_group;
mod shared;
mod supplier;

use axum::Router;

use self::shared::{UpstreamState, UpstreamStore, UpstreamVerifier};

pub(crate) fn admin_upstream_router_with_store(
    store: UpstreamStore,
    verifier: UpstreamVerifier,
) -> Router {
    Router::new()
        .merge(supplier::routes())
        .merge(account::routes())
        .merge(account_group::routes())
        .with_state(UpstreamState { store, verifier })
}
