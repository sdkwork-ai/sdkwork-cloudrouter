use std::sync::Arc;
use std::time::{SystemTime, UNIX_EPOCH};

use axum::extract::State;
use axum::http::{HeaderMap, StatusCode};
use axum::response::{IntoResponse, Response};
use axum::routing::get;
use axum::{Json, Router};
use serde::Deserialize;

use crate::api::app_sql_subject::{
    map_optional_app_sql_subject, map_required_app_sql_subject, RequiredAppSqlScopedSubject,
    ResolvedAppSqlScopedSubject,
};
use crate::api::response::{problem_from_wire_code, success_envelope};
use crate::application::EntityUuidGenerator;
use crate::domain::DomainError;
use crate::infrastructure::OsApiKeySecretGenerator;
use crate::ports::{
    AppRoutingMappingRule, AppRoutingStrategyFuture, AppRoutingStrategySnapshot,
    AppRoutingStrategyStore, AppRoutingStrategySubject, AppRoutingStrategyType,
    UpdateAppRoutingStrategyCommand, UpdateAppRoutingStrategyOutcome,
};

const MAX_MODEL_NAME_LEN: usize = 128;
const MAX_MAPPING_RULES: usize = 200;

struct AppRoutingStrategyState {
    store: Arc<dyn AppRoutingStrategyStore + Send + Sync>,
    entity_uuid_generator: Arc<dyn EntityUuidGenerator + Send + Sync>,
    require_subject: bool,
}

impl Clone for AppRoutingStrategyState {
    fn clone(&self) -> Self {
        Self {
            store: Arc::clone(&self.store),
            entity_uuid_generator: Arc::clone(&self.entity_uuid_generator),
            require_subject: self.require_subject,
        }
    }
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct UpdateRoutingStrategyRequest {
    strategy: Option<AppRoutingStrategyType>,
    mapping_rules: Option<Vec<UpdateRoutingMappingRuleRequest>>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct UpdateRoutingMappingRuleRequest {
    id: Option<String>,
    source_model: Option<String>,
    target_model: Option<String>,
}

struct EmptyAppRoutingStrategyStore;

impl AppRoutingStrategyStore for EmptyAppRoutingStrategyStore {
    fn load_routing_strategy<'a>(
        &'a self,
        _subject: Option<AppRoutingStrategySubject>,
    ) -> AppRoutingStrategyFuture<'a, AppRoutingStrategySnapshot> {
        Box::pin(async { Ok(AppRoutingStrategySnapshot::default()) })
    }

    fn update_routing_strategy<'a>(
        &'a self,
        _command: UpdateAppRoutingStrategyCommand,
    ) -> AppRoutingStrategyFuture<'a, UpdateAppRoutingStrategyOutcome> {
        Box::pin(async {
            Err(DomainError::new(
                "routing strategy command store is unavailable without database configuration",
            ))
        })
    }
}

pub fn app_routing_strategy_router() -> Router {
    app_routing_strategy_router_with_state(
        Arc::new(EmptyAppRoutingStrategyStore),
        Arc::new(OsApiKeySecretGenerator),
        false,
    )
}

pub fn app_routing_strategy_router_with_store(
    store: Arc<dyn AppRoutingStrategyStore + Send + Sync>,
    entity_uuid_generator: Arc<dyn EntityUuidGenerator + Send + Sync>,
) -> Router {
    app_routing_strategy_router_with_state(store, entity_uuid_generator, true)
}

fn app_routing_strategy_router_with_state(
    store: Arc<dyn AppRoutingStrategyStore + Send + Sync>,
    entity_uuid_generator: Arc<dyn EntityUuidGenerator + Send + Sync>,
    require_subject: bool,
) -> Router {
    Router::new()
        .route(
            "/app/v3/api/ai/routing/strategy",
            get(fetch_routing_strategy).put(update_routing_strategy),
        )
        .with_state(AppRoutingStrategyState {
            store,
            entity_uuid_generator,
            require_subject,
        })
}

async fn fetch_routing_strategy(
    State(state): State<AppRoutingStrategyState>,
    ResolvedAppSqlScopedSubject(subject): ResolvedAppSqlScopedSubject,
) -> Response {
    let subject = match map_optional_app_sql_subject(subject, state.require_subject, |scoped| {
        scoped.into()
    }) {
        Ok(subject) => subject,
        Err(response) => return response,
    };

    match state.store.load_routing_strategy(subject).await {
        Ok(snapshot) => Json(success_envelope(snapshot)).into_response(),
        Err(error) => {
            routing_strategy_system_response("routing strategy read model is unavailable", error)
        }
    }
}

async fn update_routing_strategy(
    State(state): State<AppRoutingStrategyState>,
    RequiredAppSqlScopedSubject(subject): RequiredAppSqlScopedSubject,
    _headers: HeaderMap,
    Json(request): Json<UpdateRoutingStrategyRequest>,
) -> Response {
    let subject = map_required_app_sql_subject(subject, AppRoutingStrategySubject::from);
    let snapshot = match validate_update_routing_strategy_request(request) {
        Ok(snapshot) => snapshot,
        Err(message) => return bad_request(message),
    };
    let command = match build_update_routing_strategy_command(state.clone(), subject, snapshot) {
        Ok(command) => command,
        Err(error) => {
            return routing_strategy_system_response("routing strategy command is invalid", error);
        }
    };

    match state.store.update_routing_strategy(command).await {
        Ok(outcome) => Json(success_envelope(outcome)).into_response(),
        Err(error) => {
            routing_strategy_system_response("routing strategy command store is unavailable", error)
        }
    }
}

fn validate_update_routing_strategy_request(
    request: UpdateRoutingStrategyRequest,
) -> Result<AppRoutingStrategySnapshot, String> {
    let strategy = request
        .strategy
        .ok_or_else(|| "strategy must be provided".to_owned())?;
    let raw_rules = request
        .mapping_rules
        .ok_or_else(|| "mappingRules must be provided".to_owned())?;
    if raw_rules.len() > MAX_MAPPING_RULES {
        return Err(format!(
            "mappingRules length must not exceed {MAX_MAPPING_RULES}"
        ));
    }

    let mut mapping_rules = Vec::with_capacity(raw_rules.len());
    for (index, rule) in raw_rules.into_iter().enumerate() {
        let source_model = normalize_model_name(rule.source_model.as_deref(), "sourceModel")?;
        let target_model = normalize_model_name(rule.target_model.as_deref(), "targetModel")?;
        let id = normalize_optional_rule_id(rule.id.as_deref())
            .unwrap_or_else(|| format!("rule-{}", index + 1));
        if mapping_rules
            .iter()
            .any(|existing: &AppRoutingMappingRule| {
                existing.source_model.eq_ignore_ascii_case(&source_model)
            })
        {
            return Err(format!(
                "mappingRules sourceModel must be unique: {source_model}"
            ));
        }
        mapping_rules.push(AppRoutingMappingRule {
            id,
            source_model,
            target_model,
        });
    }

    Ok(AppRoutingStrategySnapshot {
        strategy,
        mapping_rules,
    })
}

fn normalize_model_name(value: Option<&str>, field_name: &str) -> Result<String, String> {
    let value = value.unwrap_or("").trim();
    if value.is_empty() {
        return Err(format!("mappingRules.{field_name} must not be empty"));
    }
    if value.chars().count() > MAX_MODEL_NAME_LEN {
        return Err(format!(
            "mappingRules.{field_name} length must not exceed {MAX_MODEL_NAME_LEN} characters"
        ));
    }
    if value
        .chars()
        .any(|ch| ch.is_ascii_control() || ch.is_whitespace())
    {
        return Err(format!(
            "mappingRules.{field_name} must not contain whitespace or control characters"
        ));
    }
    Ok(value.to_owned())
}

fn normalize_optional_rule_id(value: Option<&str>) -> Option<String> {
    value
        .map(str::trim)
        .filter(|value| !value.is_empty())
        .map(|value| value.chars().take(64).collect())
}

fn build_update_routing_strategy_command(
    state: AppRoutingStrategyState,
    subject: AppRoutingStrategySubject,
    snapshot: AppRoutingStrategySnapshot,
) -> Result<UpdateAppRoutingStrategyCommand, DomainError> {
    let rule_uuids = (0..snapshot.mapping_rules.len())
        .map(|_| state.entity_uuid_generator.generate_entity_uuid())
        .collect::<Result<Vec<_>, _>>()?;

    Ok(UpdateAppRoutingStrategyCommand {
        subject,
        snapshot,
        policy_uuid: state.entity_uuid_generator.generate_entity_uuid()?,
        profile_uuid: state.entity_uuid_generator.generate_entity_uuid()?,
        rule_uuids,
        requested_at: current_timestamp_string(),
    })
}

fn bad_request(message: String) -> Response {
    problem_from_wire_code("4001", message).into_response()
}

fn routing_strategy_system_response(context: &str, error: DomainError) -> Response {
    tracing::error!(error = %error, context, "routing strategy API failed");
    problem_from_wire_code("5000", context.to_owned()).into_response()
}

fn current_timestamp_string() -> String {
    let seconds = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|duration| duration.as_secs() as i64)
        .unwrap_or(0);
    format_unix_timestamp(seconds)
}

fn format_unix_timestamp(seconds: i64) -> String {
    let days = seconds.div_euclid(86_400);
    let seconds_of_day = seconds.rem_euclid(86_400);
    let (year, month, day) = civil_from_days(days);
    let hour = seconds_of_day / 3_600;
    let minute = (seconds_of_day % 3_600) / 60;
    let second = seconds_of_day % 60;
    format!("{year:04}-{month:02}-{day:02} {hour:02}:{minute:02}:{second:02}")
}

fn civil_from_days(days: i64) -> (i64, i64, i64) {
    let days = days + 719_468;
    let era = if days >= 0 { days } else { days - 146_096 } / 146_097;
    let day_of_era = days - era * 146_097;
    let year_of_era =
        (day_of_era - day_of_era / 1_460 + day_of_era / 36_524 - day_of_era / 146_096) / 365;
    let year = year_of_era + era * 400;
    let day_of_year = day_of_era - (365 * year_of_era + year_of_era / 4 - year_of_era / 100);
    let month_prime = (5 * day_of_year + 2) / 153;
    let day = day_of_year - (153 * month_prime + 2) / 5 + 1;
    let month = month_prime + if month_prime < 10 { 3 } else { -9 };
    let year = year + if month <= 2 { 1 } else { 0 };
    (year, month, day)
}
