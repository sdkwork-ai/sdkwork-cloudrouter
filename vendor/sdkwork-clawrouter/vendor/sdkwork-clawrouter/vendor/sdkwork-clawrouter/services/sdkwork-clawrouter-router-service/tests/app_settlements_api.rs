mod common;
use common::InternalTrustedSubjectHeaders;
use std::future::Future;
use std::pin::Pin;
use std::sync::{Arc, Mutex};

use axum::body::Body;
use axum::http::{Request, StatusCode};
use sdkwork_clawrouter_router_service::api::app_settlements_dashboard_router_with_read_store;
use sdkwork_clawrouter_router_service::domain::DomainResult;
use sdkwork_clawrouter_router_service::ports::{
    SettlementChartPoint, SettlementsDashboardQuery, SettlementsDashboardReadFuture,
    SettlementsDashboardReadStore, SettlementsDashboardSnapshot, SettlementsDashboardSubject,
};
use serde_json::Value;
use tower::ServiceExt;

#[tokio::test]
async fn app_settlements_dashboard_billing_route_matches_app_sdk_contract() {
    let read_store = Arc::new(CapturingSettlementsDashboardReadStore::default());
    let router = app_settlements_dashboard_router_with_read_store(read_store.clone());

    let response = router
        .oneshot(
            Request::builder()
                .uri("/app/v3/api/billing/settlements/dashboard?year=2026")
                .internal_trusted_subject(10, 20, 30)
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(StatusCode::OK, response.status());
    let payload = response_json(response).await;
    assert_eq!("2000", payload["code"]);
    assert_eq!("2026-04-29", payload["data"]["chartData"][0]["day"]);

    let captured_query = read_store.captured_query.lock().unwrap().clone().unwrap();
    let captured_subject = read_store.captured_subject.lock().unwrap().unwrap();
    assert_eq!(Some(2026), captured_query.year);
    assert_eq!(10, captured_subject.tenant_id);
    assert_eq!(20, captured_subject.organization_id);
    assert_eq!(30, captured_subject.user_id);
}

async fn response_json(response: axum::response::Response) -> Value {
    let body = axum::body::to_bytes(response.into_body(), usize::MAX)
        .await
        .unwrap();
    serde_json::from_slice(&body).unwrap()
}

#[derive(Default)]
struct CapturingSettlementsDashboardReadStore {
    captured_query: Mutex<Option<SettlementsDashboardQuery>>,
    captured_subject: Mutex<Option<SettlementsDashboardSubject>>,
}

impl SettlementsDashboardReadStore for CapturingSettlementsDashboardReadStore {
    fn load_settlements_dashboard<'a>(
        &'a self,
        query: SettlementsDashboardQuery,
        subject: Option<SettlementsDashboardSubject>,
    ) -> SettlementsDashboardReadFuture<'a> {
        async_result(async move {
            *self.captured_query.lock().unwrap() = Some(query);
            *self.captured_subject.lock().unwrap() = subject;
            Ok(SettlementsDashboardSnapshot {
                chart_data: vec![SettlementChartPoint {
                    day: "2026-04-29".to_owned(),
                    text: "1.000000".to_owned(),
                    image: "0.000000".to_owned(),
                    video: "0.000000".to_owned(),
                    audio: "0.000000".to_owned(),
                    music: "0.000000".to_owned(),
                }],
                bills: Vec::new(),
            })
        })
    }
}

fn async_result<'a, T, F>(future: F) -> Pin<Box<dyn Future<Output = DomainResult<T>> + Send + 'a>>
where
    T: Send + 'a,
    F: Future<Output = DomainResult<T>> + Send + 'a,
{
    Box::pin(future)
}
