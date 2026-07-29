use std::future::Future;
use std::io;
use std::net::SocketAddr;
use std::pin::Pin;
use std::task::{Context, Poll};

use hyper_util::client::legacy::connect::dns::{GaiResolver, Name};
use sdkwork_claw_security::{validate_resolved_outbound_ip, OutboundTargetPolicy};
use tower::Service;

type ResolveFuture = Pin<
    Box<dyn Future<Output = Result<std::vec::IntoIter<SocketAddr>, io::Error>> + Send + 'static>,
>;

/// DNS resolver that enforces the outbound address policy on the exact
/// addresses handed to Hyper for connection establishment.
#[derive(Clone, Debug)]
pub struct OutboundDnsResolver {
    inner: GaiResolver,
    policy: OutboundTargetPolicy,
}

impl OutboundDnsResolver {
    pub fn new(policy: OutboundTargetPolicy) -> Self {
        Self {
            inner: GaiResolver::new(),
            policy,
        }
    }
}

impl Service<Name> for OutboundDnsResolver {
    type Response = std::vec::IntoIter<SocketAddr>;
    type Error = io::Error;
    type Future = ResolveFuture;

    fn poll_ready(&mut self, context: &mut Context<'_>) -> Poll<Result<(), Self::Error>> {
        self.inner.poll_ready(context)
    }

    fn call(&mut self, name: Name) -> Self::Future {
        let resolution = self.inner.call(name);
        let policy = self.policy;
        Box::pin(async move {
            let addresses = resolution.await?.collect::<Vec<_>>();
            if addresses.is_empty() {
                return Err(io::Error::new(
                    io::ErrorKind::NotFound,
                    "outbound target DNS resolution returned no addresses",
                ));
            }
            if addresses
                .iter()
                .any(|address| validate_resolved_outbound_ip(address.ip(), policy).is_err())
            {
                return Err(io::Error::new(
                    io::ErrorKind::PermissionDenied,
                    "outbound target DNS resolution returned a forbidden address",
                ));
            }
            Ok(addresses.into_iter())
        })
    }
}

#[cfg(test)]
mod tests {
    use super::OutboundDnsResolver;
    use hyper_util::client::legacy::connect::dns::Name;
    use sdkwork_claw_security::OutboundTargetPolicy;
    use std::str::FromStr;
    use tower::Service;

    #[tokio::test]
    async fn production_resolver_rejects_localhost_answers() {
        let mut resolver = OutboundDnsResolver::new(OutboundTargetPolicy::Production);
        let error = resolver
            .call(Name::from_str("localhost").unwrap())
            .await
            .unwrap_err();

        assert_eq!(std::io::ErrorKind::PermissionDenied, error.kind());
    }

    #[tokio::test]
    async fn development_resolver_allows_localhost_answers() {
        let mut resolver = OutboundDnsResolver::new(OutboundTargetPolicy::Development);
        let addresses = resolver
            .call(Name::from_str("localhost").unwrap())
            .await
            .unwrap()
            .collect::<Vec<_>>();

        assert!(!addresses.is_empty());
    }
}
