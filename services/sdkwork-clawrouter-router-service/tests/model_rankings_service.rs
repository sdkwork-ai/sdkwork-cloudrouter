use std::sync::atomic::{AtomicI64, AtomicU64, Ordering};
use std::sync::{Arc, Mutex};
use std::time::{Duration, Instant};

use sdkwork_clawrouter_router_service::application::ModelRankingsService;
use sdkwork_clawrouter_router_service::domain::DomainResult;
use sdkwork_clawrouter_router_service::ports::{
    ModelRankingRefreshJobHistoryPage, ModelRankingRefreshJobHistoryQuery,
    ModelRankingRefreshJobHistoryReadFuture, ModelRankingRefreshJobHistoryReadStore,
    ModelRankingRefreshStatus, ModelRankingRefreshStatusQuery, ModelRankingRefreshStatusReadFuture,
    ModelRankingRefreshStatusReadStore, ModelRankingsCacheInvalidation,
    ModelRankingsCacheInvalidator, ModelRankingsQuery, ModelRankingsReadFuture,
    ModelRankingsReadStore, ModelRankingsSnapshot, ModelRankingsSource, ModelRankingsSubject,
};

#[derive(Clone)]
struct ManualClock {
    origin: Instant,
    elapsed_millis: Arc<AtomicU64>,
}

impl ManualClock {
    fn new() -> Self {
        Self {
            origin: Instant::now(),
            elapsed_millis: Arc::new(AtomicU64::new(0)),
        }
    }

    fn now(&self) -> Instant {
        self.origin + Duration::from_millis(self.elapsed_millis.load(Ordering::Relaxed))
    }

    fn advance(&self, duration: Duration) {
        let delta = duration.as_millis().min(u128::from(u64::MAX)) as u64;
        self.elapsed_millis.fetch_add(delta, Ordering::Relaxed);
    }
}

#[tokio::test]
async fn model_rankings_service_respects_snapshot_cache_max_age_before_fallback_ttl() {
    let store = Arc::new(CountingModelRankingsReadStore::new(1));
    let clock = ManualClock::new();
    let service = ModelRankingsService::with_fallback_ttl_seconds_and_clock(store.clone(), 30, {
        let clock = clock.clone();
        move || clock.now()
    });
    let query = ModelRankingsQuery {
        limit: 200,
        ..ModelRankingsQuery::default()
    };

    let first = service
        .load_model_rankings(query.clone(), None)
        .await
        .unwrap();
    clock.advance(Duration::from_millis(1_100));
    let second = service.load_model_rankings(query, None).await.unwrap();

    assert_eq!("snapshot-1", first.source.observed_at);
    assert_eq!("snapshot-2", second.source.observed_at);
    assert_eq!(2, store.calls.load(Ordering::SeqCst));
}

#[tokio::test]
async fn model_rankings_service_shares_cache_across_users_in_same_tenant_organization_scope() {
    let store = Arc::new(CountingModelRankingsReadStore::new(60));
    let service = ModelRankingsService::new(store.clone());
    let query = ModelRankingsQuery {
        rank_scope: Some("commercial-default".to_owned()),
        limit: 200,
        ..ModelRankingsQuery::default()
    };

    let first = service
        .load_model_rankings(
            query.clone(),
            Some(
                sdkwork_clawrouter_router_service::ports::ModelRankingsSubject {
                    tenant_id: 9,
                    organization_id: 99,
                    user_id: 1,
                },
            ),
        )
        .await
        .unwrap();
    let second = service
        .load_model_rankings(
            query,
            Some(
                sdkwork_clawrouter_router_service::ports::ModelRankingsSubject {
                    tenant_id: 9,
                    organization_id: 99,
                    user_id: 2,
                },
            ),
        )
        .await
        .unwrap();

    assert_eq!("snapshot-1", first.source.observed_at);
    assert_eq!("snapshot-1", second.source.observed_at);
    assert_eq!(1, store.calls.load(Ordering::SeqCst));
}

#[tokio::test]
async fn model_rankings_service_shares_refresh_status_cache_by_tenant_organization_scope() {
    let store = Arc::new(CountingModelRankingsReadStore::new(60));
    let service = ModelRankingsService::new(store.clone());
    let query = ModelRankingRefreshStatusQuery {
        rank_scope: Some("commercial-default".to_owned()),
    };

    let first = service
        .load_model_ranking_refresh_status(
            query.clone(),
            Some(
                sdkwork_clawrouter_router_service::ports::ModelRankingsSubject {
                    tenant_id: 9,
                    organization_id: 99,
                    user_id: 1,
                },
            ),
        )
        .await
        .unwrap();
    let second = service
        .load_model_ranking_refresh_status(
            query,
            Some(
                sdkwork_clawrouter_router_service::ports::ModelRankingsSubject {
                    tenant_id: 9,
                    organization_id: 99,
                    user_id: 2,
                },
            ),
        )
        .await
        .unwrap();

    assert_eq!("snapshot-1", first.snapshot_date);
    assert_eq!("snapshot-1", second.snapshot_date);
    assert_eq!(1, store.status_calls.load(Ordering::SeqCst));
}

#[tokio::test]
async fn model_rankings_service_invalidates_rankings_and_status_cache_for_refreshed_scope() {
    let store = Arc::new(CountingModelRankingsReadStore::new(60));
    let service = ModelRankingsService::new(store.clone());
    let subject = Some(
        sdkwork_clawrouter_router_service::ports::ModelRankingsSubject {
            tenant_id: 9,
            organization_id: 99,
            user_id: 1,
        },
    );
    let query = ModelRankingsQuery {
        limit: 200,
        ..ModelRankingsQuery::default()
    };
    let status_query = ModelRankingRefreshStatusQuery::default();

    let first = service
        .load_model_rankings(query.clone(), subject)
        .await
        .unwrap();
    let first_status = service
        .load_model_ranking_refresh_status(status_query.clone(), subject)
        .await
        .unwrap();

    service.invalidate_model_rankings_cache(ModelRankingsCacheInvalidation {
        tenant_id: 9,
        organization_id: 99,
        rank_scope: Some("commercial-default".to_owned()),
    });

    let second = service.load_model_rankings(query, subject).await.unwrap();
    let second_status = service
        .load_model_ranking_refresh_status(status_query, subject)
        .await
        .unwrap();

    assert_eq!("snapshot-1", first.source.observed_at);
    assert_eq!("snapshot-2", second.source.observed_at);
    assert_eq!("snapshot-1", first_status.snapshot_date);
    assert_eq!("snapshot-2", second_status.snapshot_date);
    assert_eq!(2, store.calls.load(Ordering::SeqCst));
    assert_eq!(2, store.status_calls.load(Ordering::SeqCst));
}

#[tokio::test]
async fn model_rankings_service_global_invalidation_clears_tenant_scoped_fallback_cache() {
    let store = Arc::new(CountingModelRankingsReadStore::new(60));
    let service = ModelRankingsService::new(store.clone());
    let query = ModelRankingsQuery {
        limit: 200,
        ..ModelRankingsQuery::default()
    };

    let first = service
        .load_model_rankings(
            query.clone(),
            Some(
                sdkwork_clawrouter_router_service::ports::ModelRankingsSubject {
                    tenant_id: 9,
                    organization_id: 99,
                    user_id: 1,
                },
            ),
        )
        .await
        .unwrap();

    service.invalidate_model_rankings_cache(ModelRankingsCacheInvalidation {
        tenant_id: 0,
        organization_id: 0,
        rank_scope: Some("commercial-default".to_owned()),
    });

    let second = service
        .load_model_rankings(
            query,
            Some(
                sdkwork_clawrouter_router_service::ports::ModelRankingsSubject {
                    tenant_id: 9,
                    organization_id: 99,
                    user_id: 1,
                },
            ),
        )
        .await
        .unwrap();

    assert_eq!("snapshot-1", first.source.observed_at);
    assert_eq!("snapshot-2", second.source.observed_at);
    assert_eq!(2, store.calls.load(Ordering::SeqCst));
}

#[tokio::test]
async fn model_rankings_service_rank_scope_none_invalidation_clears_all_scopes_in_subject() {
    let store = Arc::new(CountingModelRankingsReadStore::new(60));
    let service = ModelRankingsService::new(store.clone());
    let subject = Some(ModelRankingsSubject {
        tenant_id: 9,
        organization_id: 99,
        user_id: 1,
    });
    let default_scope_query = ModelRankingsQuery {
        rank_scope: Some("commercial-default".to_owned()),
        limit: 200,
        ..ModelRankingsQuery::default()
    };
    let custom_scope_query = ModelRankingsQuery {
        rank_scope: Some("quality-experiment".to_owned()),
        limit: 200,
        ..ModelRankingsQuery::default()
    };

    let first_default = service
        .load_model_rankings(default_scope_query.clone(), subject)
        .await
        .unwrap();
    let first_custom = service
        .load_model_rankings(custom_scope_query.clone(), subject)
        .await
        .unwrap();

    service.invalidate_model_rankings_cache(ModelRankingsCacheInvalidation {
        tenant_id: 9,
        organization_id: 99,
        rank_scope: None,
    });

    let second_default = service
        .load_model_rankings(default_scope_query, subject)
        .await
        .unwrap();
    let second_custom = service
        .load_model_rankings(custom_scope_query, subject)
        .await
        .unwrap();

    assert_eq!("snapshot-1", first_default.source.observed_at);
    assert_eq!("snapshot-2", first_custom.source.observed_at);
    assert_eq!("snapshot-3", second_default.source.observed_at);
    assert_eq!("snapshot-4", second_custom.source.observed_at);
    assert_eq!(4, store.calls.load(Ordering::SeqCst));
}

#[tokio::test]
async fn model_rankings_service_normalizes_invalid_global_organization_subject_for_cache() {
    let store = Arc::new(CountingModelRankingsReadStore::new(60));
    let service = ModelRankingsService::new(store.clone());
    let query = ModelRankingsQuery {
        limit: 200,
        ..ModelRankingsQuery::default()
    };

    let first = service
        .load_model_rankings(
            query.clone(),
            Some(
                sdkwork_clawrouter_router_service::ports::ModelRankingsSubject {
                    tenant_id: 0,
                    organization_id: 0,
                    user_id: 30,
                },
            ),
        )
        .await
        .unwrap();
    let second = service.load_model_rankings(query, None).await.unwrap();

    assert_eq!("snapshot-1", first.source.observed_at);
    assert_eq!("snapshot-1", second.source.observed_at);
    assert_eq!(1, store.calls.load(Ordering::SeqCst));
}

#[tokio::test]
async fn model_rankings_service_normalizes_invalid_global_organization_invalidation() {
    let store = Arc::new(CountingModelRankingsReadStore::new(60));
    let service = ModelRankingsService::new(store.clone());
    let query = ModelRankingsQuery {
        limit: 200,
        ..ModelRankingsQuery::default()
    };

    let first = service
        .load_model_rankings(query.clone(), None)
        .await
        .unwrap();
    service.invalidate_model_rankings_cache(ModelRankingsCacheInvalidation {
        tenant_id: 0,
        organization_id: 0,
        rank_scope: Some(" Commercial-Default ".to_owned()),
    });
    let second = service.load_model_rankings(query, None).await.unwrap();

    assert_eq!("snapshot-1", first.source.observed_at);
    assert_eq!("snapshot-2", second.source.observed_at);
    assert_eq!(2, store.calls.load(Ordering::SeqCst));
}

#[tokio::test]
async fn model_rankings_service_normalizes_subject_before_read_store() {
    let store = Arc::new(CountingModelRankingsReadStore::new(60));
    let service = ModelRankingsService::new(store.clone());

    service
        .load_model_rankings(
            ModelRankingsQuery {
                limit: 200,
                ..ModelRankingsQuery::default()
            },
            Some(ModelRankingsSubject {
                tenant_id: 100001,
                organization_id: -1,
                user_id: -2,
            }),
        )
        .await
        .unwrap();
    service
        .load_model_ranking_refresh_status(
            ModelRankingRefreshStatusQuery::default(),
            Some(ModelRankingsSubject {
                tenant_id: 0,
                organization_id: 0,
                user_id: -2,
            }),
        )
        .await
        .unwrap();
    service
        .load_model_ranking_refresh_jobs(
            ModelRankingRefreshJobHistoryQuery {
                rank_scope: None,
                limit: 20,
                offset: 0,
            },
            Some(ModelRankingsSubject {
                tenant_id: 0,
                organization_id: 0,
                user_id: -2,
            }),
        )
        .await
        .unwrap();

    assert_eq!(
        vec![Some(ModelRankingsSubject {
            tenant_id: 100001,
            organization_id: 0,
            user_id: 0,
        })],
        store.recorded_subjects()
    );
    assert_eq!(
        vec![Some(ModelRankingsSubject {
            tenant_id: 0,
            organization_id: 0,
            user_id: 0,
        })],
        store.recorded_status_subjects()
    );
    assert_eq!(
        vec![Some(ModelRankingsSubject {
            tenant_id: 0,
            organization_id: 0,
            user_id: 0,
        })],
        store.recorded_job_history_subjects()
    );
}

#[tokio::test]
async fn model_rankings_service_normalizes_filter_query_before_cache_and_read_store() {
    let store = Arc::new(CountingModelRankingsReadStore::new(60));
    let service = ModelRankingsService::new(store.clone());
    let subject = Some(
        sdkwork_clawrouter_router_service::ports::ModelRankingsSubject {
            tenant_id: 9,
            organization_id: 99,
            user_id: 1,
        },
    );
    let messy_query = ModelRankingsQuery {
        rank_scope: Some(" Commercial-Default ".to_owned()),
        vendor_code: Some(" OpenAI ".to_owned()),
        modality: Some(" TEXT ".to_owned()),
        search_query: Some(" GPT-4 ".to_owned()),
        limit: 200,
        offset: 20,
    };
    let normalized_query = ModelRankingsQuery {
        rank_scope: Some("commercial-default".to_owned()),
        vendor_code: Some("openai".to_owned()),
        modality: Some("text".to_owned()),
        search_query: Some("gpt-4".to_owned()),
        limit: 200,
        offset: 20,
    };

    let first = service
        .load_model_rankings(messy_query, subject)
        .await
        .unwrap();
    let second = service
        .load_model_rankings(normalized_query.clone(), subject)
        .await
        .unwrap();

    assert_eq!("snapshot-1", first.source.observed_at);
    assert_eq!("snapshot-1", second.source.observed_at);
    assert_eq!(1, store.calls.load(Ordering::SeqCst));
    assert_eq!(vec![normalized_query], store.recorded_queries());
}

#[tokio::test]
async fn model_rankings_service_rejects_invalid_ranking_limit_before_read_store() {
    let store = Arc::new(CountingModelRankingsReadStore::new(60));
    let service = ModelRankingsService::new(store.clone());

    let result = service
        .load_model_rankings(
            ModelRankingsQuery {
                limit: 0,
                ..ModelRankingsQuery::default()
            },
            None,
        )
        .await;

    assert!(result.is_err());
    assert_eq!(0, store.calls.load(Ordering::SeqCst));
}

#[tokio::test]
async fn model_rankings_service_normalizes_refresh_status_scope_before_read_store() {
    let store = Arc::new(CountingModelRankingsReadStore::new(60));
    let service = ModelRankingsService::new(store.clone());

    service
        .load_model_ranking_refresh_status(
            ModelRankingRefreshStatusQuery {
                rank_scope: Some(" Commercial-Default ".to_owned()),
            },
            None,
        )
        .await
        .unwrap();

    assert_eq!(
        vec![ModelRankingRefreshStatusQuery {
            rank_scope: Some("commercial-default".to_owned()),
        }],
        store.recorded_status_queries()
    );
}

#[tokio::test]
async fn model_rankings_service_normalizes_refresh_job_scope_and_rejects_invalid_limit() {
    let store = Arc::new(CountingModelRankingsReadStore::new(60));
    let service = ModelRankingsService::new(store.clone());

    service
        .load_model_ranking_refresh_jobs(
            ModelRankingRefreshJobHistoryQuery {
                rank_scope: Some(" Commercial-Default ".to_owned()),
                limit: 20,
                offset: 20,
            },
            None,
        )
        .await
        .unwrap();
    let invalid = service
        .load_model_ranking_refresh_jobs(
            ModelRankingRefreshJobHistoryQuery {
                rank_scope: Some("commercial-default".to_owned()),
                limit: 0,
                offset: 0,
            },
            None,
        )
        .await;

    assert!(invalid.is_err());
    assert_eq!(1, store.job_history_calls.load(Ordering::SeqCst));
    assert_eq!(
        vec![ModelRankingRefreshJobHistoryQuery {
            rank_scope: Some("commercial-default".to_owned()),
            limit: 20,
            offset: 20,
        }],
        store.recorded_job_history_queries()
    );
}

#[derive(Debug, Default)]
struct CountingModelRankingsReadStore {
    calls: AtomicI64,
    status_calls: AtomicI64,
    job_history_calls: AtomicI64,
    cache_max_age_seconds: i64,
    queries: Mutex<Vec<ModelRankingsQuery>>,
    subjects: Mutex<Vec<Option<ModelRankingsSubject>>>,
    status_queries: Mutex<Vec<ModelRankingRefreshStatusQuery>>,
    status_subjects: Mutex<Vec<Option<ModelRankingsSubject>>>,
    job_history_queries: Mutex<Vec<ModelRankingRefreshJobHistoryQuery>>,
    job_history_subjects: Mutex<Vec<Option<ModelRankingsSubject>>>,
}

impl CountingModelRankingsReadStore {
    fn new(cache_max_age_seconds: i64) -> Self {
        Self {
            calls: AtomicI64::new(0),
            status_calls: AtomicI64::new(0),
            job_history_calls: AtomicI64::new(0),
            cache_max_age_seconds,
            queries: Mutex::new(Vec::new()),
            subjects: Mutex::new(Vec::new()),
            status_queries: Mutex::new(Vec::new()),
            status_subjects: Mutex::new(Vec::new()),
            job_history_queries: Mutex::new(Vec::new()),
            job_history_subjects: Mutex::new(Vec::new()),
        }
    }

    fn recorded_queries(&self) -> Vec<ModelRankingsQuery> {
        self.queries.lock().unwrap().clone()
    }

    fn recorded_subjects(&self) -> Vec<Option<ModelRankingsSubject>> {
        self.subjects.lock().unwrap().clone()
    }

    fn recorded_status_queries(&self) -> Vec<ModelRankingRefreshStatusQuery> {
        self.status_queries.lock().unwrap().clone()
    }

    fn recorded_status_subjects(&self) -> Vec<Option<ModelRankingsSubject>> {
        self.status_subjects.lock().unwrap().clone()
    }

    fn recorded_job_history_queries(&self) -> Vec<ModelRankingRefreshJobHistoryQuery> {
        self.job_history_queries.lock().unwrap().clone()
    }

    fn recorded_job_history_subjects(&self) -> Vec<Option<ModelRankingsSubject>> {
        self.job_history_subjects.lock().unwrap().clone()
    }
}

impl ModelRankingsReadStore for CountingModelRankingsReadStore {
    fn load_model_rankings<'a>(
        &'a self,
        query: ModelRankingsQuery,
        subject: Option<ModelRankingsSubject>,
    ) -> ModelRankingsReadFuture<'a> {
        Box::pin(async move {
            self.queries.lock().unwrap().push(query);
            self.subjects.lock().unwrap().push(subject);
            let call = self.calls.fetch_add(1, Ordering::SeqCst) + 1;
            DomainResult::Ok(ModelRankingsSnapshot {
                total_items: 0,
                source: ModelRankingsSource {
                    observed_at: format!("snapshot-{call}"),
                    cache_max_age_seconds: self.cache_max_age_seconds,
                    ..ModelRankingsSource::default()
                },
                items: Vec::new(),
                history: Vec::new(),
            })
        })
    }
}

impl ModelRankingRefreshStatusReadStore for CountingModelRankingsReadStore {
    fn load_model_ranking_refresh_status<'a>(
        &'a self,
        query: ModelRankingRefreshStatusQuery,
        subject: Option<ModelRankingsSubject>,
    ) -> ModelRankingRefreshStatusReadFuture<'a> {
        Box::pin(async move {
            self.status_queries.lock().unwrap().push(query);
            self.status_subjects.lock().unwrap().push(subject);
            let call = self.status_calls.fetch_add(1, Ordering::SeqCst) + 1;
            DomainResult::Ok(ModelRankingRefreshStatus {
                status: "ready".to_owned(),
                rank_scope: "commercial-default".to_owned(),
                snapshot_date: format!("snapshot-{call}"),
                snapshot_period: "daily".to_owned(),
                cache_max_age_seconds: self.cache_max_age_seconds,
                ..ModelRankingRefreshStatus::default()
            })
        })
    }
}

impl ModelRankingRefreshJobHistoryReadStore for CountingModelRankingsReadStore {
    fn load_model_ranking_refresh_jobs<'a>(
        &'a self,
        query: ModelRankingRefreshJobHistoryQuery,
        subject: Option<ModelRankingsSubject>,
    ) -> ModelRankingRefreshJobHistoryReadFuture<'a> {
        Box::pin(async move {
            self.job_history_queries.lock().unwrap().push(query);
            self.job_history_subjects.lock().unwrap().push(subject);
            self.job_history_calls.fetch_add(1, Ordering::SeqCst);
            DomainResult::Ok(ModelRankingRefreshJobHistoryPage {
                total_items: 0,
                items: Vec::new(),
            })
        })
    }
}

impl ModelRankingsCacheInvalidator for CountingModelRankingsReadStore {}
