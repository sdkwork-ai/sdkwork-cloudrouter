use std::sync::Arc;
use std::time::{SystemTime, UNIX_EPOCH};

use crate::domain::DomainResult;
use crate::ports::{UsageSettlementCommand, UsageSettlementOutcome, UsageSettlementStore};

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
            batch_size: self.batch_size.max(MIN_BATCH_SIZE),
            interval_millis: self.interval_millis.max(MIN_INTERVAL_MILLIS),
        }
    }
}

impl Default for UsageSettlementWorkerConfig {
    fn default() -> Self {
        Self {
            enabled: true,
            tenant_id: 0,
            organization_id: 0,
            batch_size: DEFAULT_BATCH_SIZE,
            interval_millis: DEFAULT_INTERVAL_MILLIS,
        }
    }
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
        if !self.config.enabled {
            return Ok(UsageSettlementOutcome {
                settled_count: 0,
                failed_count: 0,
                debited_points: 0,
            });
        }

        self.store
            .settle_pending_usage(UsageSettlementCommand {
                tenant_id: self.config.tenant_id,
                organization_id: self.config.organization_id,
                limit: self.config.batch_size,
                requested_at: current_timestamp_string(),
            })
            .await
    }
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
