use axum::http::Method;
use sdkwork_clawrouter_router_service::application::{
    AuthenticatedApiKeyContext, Invocation, InvocationBilling, InvocationError,
    InvocationErrorKind, InvocationInterceptor, InvocationPipeline, InvocationRequest,
    InvocationResource, InvocationSubject,
};
use sdkwork_clawrouter_router_service::domain::{
    AiRouteModelRequirement, BillingMeter, RoutingCapability,
};
use std::sync::{Arc, Mutex};

fn test_invocation() -> Invocation {
    Invocation::new(
        InvocationRequest::new(Method::POST, "/v1/chat/completions")
            .with_request_id("req-pipeline"),
        InvocationSubject::from_api_key_context(AuthenticatedApiKeyContext {
            tenant_id: 100001,
            organization_id: 0,
            user_id: 30,
            api_key_id: 100,
            api_key_name_snapshot: "Test key".to_owned(),
            group_id: 200,
            group_code: "standard-group".to_owned(),
            pricing_plan_code: "standard".to_owned(),
        }),
        InvocationResource::model_call(
            "openai/model/chat_completions",
            "openai.chat_completions",
            RoutingCapability::Chat,
            AiRouteModelRequirement::Required,
        ),
        InvocationBilling::composite(BillingMeter::LlmInputToken),
    )
}

#[derive(Clone)]
struct RecordingInterceptor {
    name: &'static str,
    events: Arc<Mutex<Vec<String>>>,
    fail_before: bool,
}

impl RecordingInterceptor {
    fn new(name: &'static str, events: Arc<Mutex<Vec<String>>>) -> Self {
        Self {
            name,
            events,
            fail_before: false,
        }
    }

    fn failing(name: &'static str, events: Arc<Mutex<Vec<String>>>) -> Self {
        Self {
            name,
            events,
            fail_before: true,
        }
    }
}

impl InvocationInterceptor for RecordingInterceptor {
    fn name(&self) -> &str {
        self.name
    }

    fn before<'a>(
        &'a self,
        _invocation: &'a mut Invocation,
    ) -> sdkwork_clawrouter_router_service::application::InvocationFuture<'a, ()> {
        Box::pin(async move {
            self.events
                .lock()
                .expect("events")
                .push(format!("before:{}", self.name));
            if self.fail_before {
                return Err(InvocationError::new(
                    InvocationErrorKind::InvalidRequest,
                    format!("{} failed", self.name),
                ));
            }
            Ok(())
        })
    }

    fn after<'a>(
        &'a self,
        _invocation: &'a mut Invocation,
    ) -> sdkwork_clawrouter_router_service::application::InvocationFuture<'a, ()> {
        Box::pin(async move {
            self.events
                .lock()
                .expect("events")
                .push(format!("after:{}", self.name));
            Ok(())
        })
    }

    fn on_error<'a>(
        &'a self,
        _invocation: &'a mut Invocation,
        error: &'a InvocationError,
    ) -> sdkwork_clawrouter_router_service::application::InvocationFuture<'a, ()> {
        Box::pin(async move {
            self.events.lock().expect("events").push(format!(
                "error:{}:{}",
                self.name,
                error.kind.code()
            ));
            Ok(())
        })
    }
}

#[tokio::test]
async fn pipeline_runs_before_in_order_and_after_in_reverse_order() {
    let events = Arc::new(Mutex::new(Vec::new()));
    let pipeline = InvocationPipeline::new()
        .with_interceptor(RecordingInterceptor::new("auth", Arc::clone(&events)))
        .with_interceptor(RecordingInterceptor::new("route", Arc::clone(&events)))
        .with_interceptor(RecordingInterceptor::new("trace", Arc::clone(&events)));
    let mut invocation = test_invocation();

    pipeline.execute(&mut invocation).await.unwrap();

    assert_eq!(
        vec![
            "before:auth",
            "before:route",
            "before:trace",
            "after:trace",
            "after:route",
            "after:auth",
        ],
        *events.lock().expect("events")
    );
}

#[tokio::test]
async fn pipeline_short_circuits_on_before_error_and_notifies_started_interceptors() {
    let events = Arc::new(Mutex::new(Vec::new()));
    let pipeline = InvocationPipeline::new()
        .with_interceptor(RecordingInterceptor::new("auth", Arc::clone(&events)))
        .with_interceptor(RecordingInterceptor::failing("route", Arc::clone(&events)))
        .with_interceptor(RecordingInterceptor::new("dispatch", Arc::clone(&events)));
    let mut invocation = test_invocation();

    let error = pipeline.execute(&mut invocation).await.unwrap_err();

    assert_eq!(InvocationErrorKind::InvalidRequest, error.kind);
    assert_eq!(
        vec![
            "before:auth",
            "before:route",
            "error:route:invalid_request",
            "error:auth:invalid_request",
        ],
        *events.lock().expect("events")
    );
}

#[derive(Clone)]
struct ErrorObserverInterceptor {
    name: &'static str,
    events: Arc<Mutex<Vec<String>>>,
}

impl InvocationInterceptor for ErrorObserverInterceptor {
    fn name(&self) -> &str {
        self.name
    }

    fn observe_pipeline_errors(&self) -> bool {
        true
    }

    fn on_error<'a>(
        &'a self,
        _invocation: &'a mut Invocation,
        error: &'a InvocationError,
    ) -> sdkwork_clawrouter_router_service::application::InvocationFuture<'a, ()> {
        Box::pin(async move {
            self.events.lock().expect("events").push(format!(
                "observer:{}:{}",
                self.name,
                error.kind.code()
            ));
            Ok(())
        })
    }
}

#[tokio::test]
async fn pipeline_notifies_error_observers_that_have_not_started() {
    let events = Arc::new(Mutex::new(Vec::new()));
    let pipeline = InvocationPipeline::new()
        .with_interceptor(RecordingInterceptor::new("payload", Arc::clone(&events)))
        .with_interceptor(RecordingInterceptor::failing("route", Arc::clone(&events)))
        .with_interceptor(ErrorObserverInterceptor {
            name: "trace",
            events: Arc::clone(&events),
        });
    let mut invocation = test_invocation();

    let error = pipeline.execute(&mut invocation).await.unwrap_err();

    assert_eq!(InvocationErrorKind::InvalidRequest, error.kind);
    assert_eq!(
        vec![
            "before:payload",
            "before:route",
            "error:route:invalid_request",
            "error:payload:invalid_request",
            "observer:trace:invalid_request",
        ],
        *events.lock().expect("events")
    );
}
