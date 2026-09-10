//! 计费主体解析的 TTL 缓存装饰器。
//!
//! 缓存键为 (tenant_id, user_id)：成员关系变更的生效延迟由 TTL 约束
//! （默认 60s）。仅缓存成功结果；`Transient`（存储抖动）不缓存，下一
//! 请求自动重试；`MembershipRequired` 是确定性结果（key 绑定组织但非
//! 成员），同样缓存以免被失效 key 高频打库。

use std::collections::HashMap;
use std::sync::atomic::{AtomicU64, Ordering};
use std::sync::{Arc, Mutex};
use std::time::{Duration, Instant};

use crate::application::AuthenticatedApiKeyContext;
use crate::ports::{
    BillingSubjectError, BillingSubjectFuture, BillingSubjectResolver, ResolvedBillingSubject,
};

const DEFAULT_TTL: Duration = Duration::from_secs(60);
const DEFAULT_MAX_ENTRIES: usize = 100_000;

#[derive(Debug, Default)]
pub struct BillingSubjectCacheMetrics {
    pub hits: AtomicU64,
    pub misses: AtomicU64,
    pub membership_required: AtomicU64,
    pub transient_errors: AtomicU64,
}

impl BillingSubjectCacheMetrics {
    /// 读取当前计数（hits, misses, membership_required, transient_errors）。
    pub fn snapshot(&self) -> (u64, u64, u64, u64) {
        (
            self.hits.load(Ordering::Relaxed),
            self.misses.load(Ordering::Relaxed),
            self.membership_required.load(Ordering::Relaxed),
            self.transient_errors.load(Ordering::Relaxed),
        )
    }
}

struct CacheEntry {
    expires_at: Instant,
    value: Result<ResolvedBillingSubject, BillingSubjectError>,
}

/// 计费主体解析缓存。
///
/// 线程安全；容量达到上限时先清理过期项，仍超限则整体清空（保守策略，
/// 换取实现简单与确定性行为）。
pub struct CachedBillingSubjectResolver {
    inner: Arc<dyn BillingSubjectResolver>,
    cache: Mutex<HashMap<(i64, i64), CacheEntry>>,
    ttl: Duration,
    max_entries: usize,
    metrics: BillingSubjectCacheMetrics,
}

impl CachedBillingSubjectResolver {
    pub fn new(inner: Arc<dyn BillingSubjectResolver>) -> Self {
        Self {
            inner,
            cache: Mutex::new(HashMap::new()),
            ttl: DEFAULT_TTL,
            max_entries: DEFAULT_MAX_ENTRIES,
            metrics: BillingSubjectCacheMetrics::default(),
        }
    }

    pub fn with_options(
        inner: Arc<dyn BillingSubjectResolver>,
        ttl: Duration,
        max_entries: usize,
    ) -> Self {
        Self {
            inner,
            cache: Mutex::new(HashMap::new()),
            ttl,
            max_entries: max_entries.max(1),
            metrics: BillingSubjectCacheMetrics::default(),
        }
    }

    pub fn metrics(&self) -> &BillingSubjectCacheMetrics {
        &self.metrics
    }

    /// 立即失效指定主体的缓存（成员关系主动变更通知入口）。
    pub fn invalidate(&self, tenant_id: i64, user_id: i64) {
        self.cache
            .lock()
            .expect("billing subject cache poisoned")
            .remove(&(tenant_id, user_id));
    }

    fn cached(
        &self,
        key: (i64, i64),
    ) -> Option<Result<ResolvedBillingSubject, BillingSubjectError>> {
        let mut cache = self.cache.lock().expect("billing subject cache poisoned");
        match cache.get(&key) {
            Some(entry) if entry.expires_at > Instant::now() => Some(entry.value.clone()),
            _ => {
                cache.remove(&key);
                None
            }
        }
    }

    fn store(&self, key: (i64, i64), value: Result<ResolvedBillingSubject, BillingSubjectError>) {
        let mut cache = self.cache.lock().expect("billing subject cache poisoned");
        if cache.len() >= self.max_entries {
            let now = Instant::now();
            cache.retain(|_, entry| entry.expires_at > now);
            if cache.len() >= self.max_entries {
                cache.clear();
            }
        }
        cache.insert(
            key,
            CacheEntry {
                expires_at: Instant::now() + self.ttl,
                value,
            },
        );
    }
}

impl BillingSubjectResolver for CachedBillingSubjectResolver {
    fn resolve<'a>(&'a self, context: &'a AuthenticatedApiKeyContext) -> BillingSubjectFuture<'a> {
        Box::pin(async move {
            // 服务级/平台级主体不参与团队计费，也无需缓存。
            if context.tenant_id <= 0 || context.user_id <= 0 {
                return Ok(ResolvedBillingSubject::personal());
            }
            let key = (context.tenant_id, context.user_id);
            if let Some(value) = self.cached(key) {
                self.metrics.hits.fetch_add(1, Ordering::Relaxed);
                if value.is_err() {
                    self.metrics
                        .membership_required
                        .fetch_add(1, Ordering::Relaxed);
                }
                return value;
            }
            self.metrics.misses.fetch_add(1, Ordering::Relaxed);
            let value = self.inner.resolve(context).await;
            match &value {
                Ok(_) | Err(BillingSubjectError::MembershipRequired { .. }) => {
                    self.store(key, value.clone());
                }
                Err(BillingSubjectError::Transient(_)) => {
                    self.metrics
                        .transient_errors
                        .fetch_add(1, Ordering::Relaxed);
                }
            }
            value
        })
    }
}

#[cfg(test)]
mod tests {
    use std::sync::atomic::{AtomicU64, Ordering};
    use std::sync::Arc;

    use super::CachedBillingSubjectResolver;
    use crate::application::AuthenticatedApiKeyContext;
    use crate::domain::BillingOwnerKind;
    use crate::ports::{
        BillingSubjectError, BillingSubjectFuture, BillingSubjectResolver, BillingSubjectSource,
        ResolvedBillingSubject,
    };

    #[derive(Default)]
    struct CountingResolver {
        calls: AtomicU64,
    }

    impl BillingSubjectResolver for CountingResolver {
        fn resolve<'a>(
            &'a self,
            context: &'a AuthenticatedApiKeyContext,
        ) -> BillingSubjectFuture<'a> {
            Box::pin(async move {
                self.calls.fetch_add(1, Ordering::SeqCst);
                if context.organization_id == 77 {
                    return Err(BillingSubjectError::MembershipRequired {
                        organization_id: 77,
                    });
                }
                if context.organization_id == 88 {
                    return Err(BillingSubjectError::Transient("storage down".into()));
                }
                Ok(ResolvedBillingSubject::team(
                    42,
                    Some("团队A".into()),
                    BillingSubjectSource::SingleMembership,
                ))
            })
        }
    }

    fn context(tenant_id: i64, user_id: i64, organization_id: i64) -> AuthenticatedApiKeyContext {
        AuthenticatedApiKeyContext {
            api_key_id: 1,
            api_key_name_snapshot: "key".into(),
            tenant_id,
            organization_id,
            user_id,
            group_id: 0,
            group_code: String::new(),
            pricing_plan_code: String::new(),
        }
    }

    #[tokio::test]
    async fn caches_success_and_membership_required_but_not_transient() {
        let inner = Arc::new(CountingResolver::default());
        let resolver = CachedBillingSubjectResolver::with_options(
            Arc::clone(&inner) as Arc<dyn BillingSubjectResolver>,
            std::time::Duration::from_secs(60),
            1024,
        );

        // 成功结果缓存：第二次命中缓存，不触发底层调用。
        let first = resolver.resolve(&context(1, 2, 0)).await.unwrap();
        let second = resolver.resolve(&context(1, 2, 0)).await.unwrap();
        assert_eq!(first, second);
        assert_eq!(first.kind, BillingOwnerKind::Organization);
        assert_eq!(first.organization_id, 42);
        assert_eq!(inner.calls.load(Ordering::SeqCst), 1);

        // MembershipRequired 确定性失败同样缓存。
        let _ = resolver.resolve(&context(1, 3, 77)).await;
        let denied = resolver.resolve(&context(1, 3, 77)).await;
        assert!(matches!(
            denied,
            Err(BillingSubjectError::MembershipRequired {
                organization_id: 77
            })
        ));
        assert_eq!(inner.calls.load(Ordering::SeqCst), 2);

        // Transient 失败不缓存：每次都重试。
        let _ = resolver.resolve(&context(1, 4, 88)).await;
        let _ = resolver.resolve(&context(1, 4, 88)).await;
        assert_eq!(inner.calls.load(Ordering::SeqCst), 4);

        // 平台级主体直接短路个人计费。
        let platform = resolver.resolve(&context(0, 0, 0)).await.unwrap();
        assert_eq!(platform.kind, BillingOwnerKind::Personal);

        let (hits, misses, membership_required, transient) = resolver.metrics().snapshot();
        // hits = 成功缓存命中 1 + MembershipRequired 缓存命中 1。
        assert_eq!(hits, 2);
        assert_eq!(misses, 4);
        assert_eq!(membership_required, 1);
        assert_eq!(transient, 2);
    }

    #[tokio::test]
    async fn invalidate_forces_next_resolution() {
        let inner = Arc::new(CountingResolver::default());
        let resolver = CachedBillingSubjectResolver::with_options(
            Arc::clone(&inner) as Arc<dyn BillingSubjectResolver>,
            std::time::Duration::from_secs(60),
            1024,
        );
        let _ = resolver.resolve(&context(1, 9, 0)).await;
        resolver.invalidate(1, 9);
        let _ = resolver.resolve(&context(1, 9, 0)).await;
        assert_eq!(inner.calls.load(Ordering::SeqCst), 2);
    }
}
