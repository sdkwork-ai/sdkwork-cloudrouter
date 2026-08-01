use std::sync::{Arc, OnceLock};
use std::time::{Instant, SystemTime, UNIX_EPOCH};

use crate::domain::DomainResult;
use crate::ports::{
    UsageSettlementCommand, UsageSettlementOutcome, UsageSettlementStore,
    MAX_USAGE_SETTLEMENT_BATCH_SIZE,
};

const MIN_BATCH_SIZE: i64 = 1;
const DEFAULT_BATCH_SIZE: i64 = 100;
const DEFAULT_INTERVAL_MILLIS: u64 = 30_000;
const MIN_INTERVAL_MILLIS: u64 = 1_000;

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct UsageSettlementWorkerConfig {
    pub enabled: bool,
    pub tenant_id: i64,
    pub organization_id: i64,
    pub batch_size: i64,
    pub interval_millis: u64,
}

impl UsageSettlementWorkerConfig {
    pub(crate) const MAX_BATCH_SIZE: i64 = MAX_USAGE_SETTLEMENT_BATCH_SIZE;

    pub fn disabled() -> Self {
        Self {
            enabled: false,
            ..Self::default()
        }
    }

    pub fn normalized(self) -> Self {
        Self {
            enabled: self.enabled,
            tenant_id: self.tenant_id.max(0),
            organization_id: self.organization_id.max(0),
            batch_size: sdkwork_utils_rust::clamp(
                self.batch_size,
                MIN_BATCH_SIZE,
                Self::MAX_BATCH_SIZE,
            ),
            interval_millis: self.interval_millis.max(MIN_INTERVAL_MILLIS),
        }
    }
}

impl Default for UsageSettlementWorkerConfig {
    fn default() -> Self {
        Self {
            enabled: false,
            tenant_id: 0,
            organization_id: 0,
            batch_size: DEFAULT_BATCH_SIZE,
            interval_millis: DEFAULT_INTERVAL_MILLIS,
        }
    }
}

impl UsageSettlementWorkerConfig {
    pub fn validate_for_deployment(&self) -> Result<(), String> {
        if !(MIN_BATCH_SIZE..=Self::MAX_BATCH_SIZE).contains(&self.batch_size) {
            return Err(format!(
                "usage settlement worker batch_size must be between {MIN_BATCH_SIZE} and {}",
                Self::MAX_BATCH_SIZE
            ));
        }

        if !self.enabled {
            return Ok(());
        }

        if self.tenant_id > 0 {
            return Ok(());
        }

        if platform_settlement_scope_allowed() {
            return Ok(());
        }

        Err(
            "usage settlement worker requires SDKWORK_CLAW_USAGE_SETTLEMENT_TENANT_ID > 0 or explicit SDKWORK_CLAW_USAGE_SETTLEMENT_PLATFORM_SCOPE=true when enabled"
                .to_owned(),
        )
    }
}

fn platform_settlement_scope_allowed() -> bool {
    std::env::var("SDKWORK_CLAW_USAGE_SETTLEMENT_PLATFORM_SCOPE")
        .ok()
        .map(|value| {
            matches!(
                value.trim().to_ascii_lowercase().as_str(),
                "1" | "true" | "yes" | "on"
            )
        })
        .unwrap_or(false)
}

#[derive(Clone)]
pub struct UsageSettlementWorker {
    store: Arc<dyn UsageSettlementStore + Send + Sync>,
    config: UsageSettlementWorkerConfig,
}

impl UsageSettlementWorker {
    pub fn new(
        store: Arc<dyn UsageSettlementStore + Send + Sync>,
        config: UsageSettlementWorkerConfig,
    ) -> Self {
        Self {
            store,
            config: config.normalized(),
        }
    }

    pub fn config(&self) -> UsageSettlementWorkerConfig {
        self.config
    }

    pub async fn run_once(&self) -> DomainResult<UsageSettlementOutcome> {
        let started_at = Instant::now();
        if !self.config.enabled {
            observe_settlement_run("disabled", started_at.elapsed());
            return Ok(UsageSettlementOutcome {
                settled_count: 0,
                failed_count: 0,
                debited_points: 0,
            });
        }

        let result = self
            .store
            .settle_pending_usage(UsageSettlementCommand {
                tenant_id: self.config.tenant_id,
                organization_id: self.config.organization_id,
                limit: self.config.batch_size,
                requested_at: current_timestamp_string(),
            })
            .await;
        match &result {
            Ok(outcome) => {
                let outcome_label = settlement_outcome_label(outcome);
                observe_settlement_run(outcome_label, started_at.elapsed());
                settlement_item_counter()
                    .with_label_values(&["settled"])
                    .inc_by(non_negative_counter_value(outcome.settled_count));
                settlement_item_counter()
                    .with_label_values(&["failed"])
                    .inc_by(non_negative_counter_value(outcome.failed_count));
            }
            Err(_) => {
                observe_settlement_run("error", started_at.elapsed());
                settlement_error_counter().inc();
            }
        }
        result
    }
}

fn settlement_outcome_label(outcome: &UsageSettlementOutcome) -> &'static str {
    if outcome.failed_count > 0 {
        "partial_failure"
    } else {
        "success"
    }
}

fn non_negative_counter_value(value: i64) -> u64 {
    u64::try_from(value).unwrap_or(0)
}

fn observe_settlement_run(outcome: &'static str, duration: std::time::Duration) {
    settlement_run_counter().with_label_values(&[outcome]).inc();
    settlement_duration_histogram()
        .with_label_values(&[outcome])
        .observe(duration.as_secs_f64());
}

fn settlement_run_counter() -> prometheus::IntCounterVec {
    static METRIC: OnceLock<prometheus::IntCounterVec> = OnceLock::new();
    METRIC
        .get_or_init(|| {
            let metric = prometheus::IntCounterVec::new(
                prometheus::Opts::new(
                    "clawrouter_usage_settlement_runs_total",
                    "Usage settlement worker runs by terminal outcome.",
                ),
                &["outcome"],
            )
            .expect("usage settlement run metric");
            let _ = prometheus::register(Box::new(metric.clone()));
            metric
        })
        .clone()
}

fn settlement_duration_histogram() -> prometheus::HistogramVec {
    static METRIC: OnceLock<prometheus::HistogramVec> = OnceLock::new();
    METRIC
        .get_or_init(|| {
            let metric = prometheus::HistogramVec::new(
                prometheus::HistogramOpts::new(
                    "clawrouter_usage_settlement_duration_seconds",
                    "Usage settlement worker run duration in seconds.",
                )
                .buckets(vec![0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1.0, 2.5, 5.0, 10.0]),
                &["outcome"],
            )
            .expect("usage settlement duration metric");
            let _ = prometheus::register(Box::new(metric.clone()));
            metric
        })
        .clone()
}

fn settlement_error_counter() -> prometheus::IntCounter {
    static METRIC: OnceLock<prometheus::IntCounter> = OnceLock::new();
    METRIC
        .get_or_init(|| {
            let metric = prometheus::IntCounter::new(
                "clawrouter_usage_settlement_errors_total",
                "Usage settlement worker runs that failed before producing an outcome.",
            )
            .expect("usage settlement error metric");
            let _ = prometheus::register(Box::new(metric.clone()));
            metric
        })
        .clone()
}

fn settlement_item_counter() -> prometheus::IntCounterVec {
    static METRIC: OnceLock<prometheus::IntCounterVec> = OnceLock::new();
    METRIC
        .get_or_init(|| {
            let metric = prometheus::IntCounterVec::new(
                prometheus::Opts::new(
                    "clawrouter_usage_settlement_items_total",
                    "Usage settlement items by settled or failed outcome.",
                ),
                &["outcome"],
            )
            .expect("usage settlement item metric");
            let _ = prometheus::register(Box::new(metric.clone()));
            metric
        })
        .clone()
}

fn current_timestamp_string() -> String {
    let seconds = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default()
        .as_secs() as i64;
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
    let z = days + 719_468;
    let era = if z >= 0 { z } else { z - 146_096 } / 146_097;
    let doe = z - era * 146_097;
    let yoe = (doe - doe / 1_460 + doe / 36_524 - doe / 146_096) / 365;
    let y = yoe + era * 400;
    let doy = doe - (365 * yoe + yoe / 4 - yoe / 100);
    let mp = (5 * doy + 2) / 153;
    let d = doy - (153 * mp + 2) / 5 + 1;
    let m = mp + if mp < 10 { 3 } else { -9 };
    let year = y + if m <= 2 { 1 } else { 0 };
    (year, m, d)
}
