mod account;
mod account_group;
mod resource_catalog;
mod shared;
mod supplier;

use axum::Router;

use self::shared::{UpstreamResourceStore, UpstreamState, UpstreamStore, UpstreamVerifier};

pub(crate) fn admin_upstream_router_with_store(
    store: UpstreamStore,
    verifier: UpstreamVerifier,
    resource_store: Option<UpstreamResourceStore>,
) -> Router {
    Router::new()
        .merge(supplier::routes())
        .merge(account::routes())
        .merge(account_group::routes())
        .merge(resource_catalog::routes())
        .with_state(UpstreamState {
            store,
            verifier,
            resource_store,
        })
}
