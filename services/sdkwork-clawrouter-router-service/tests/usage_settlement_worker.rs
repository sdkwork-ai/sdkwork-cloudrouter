use std::sync::{Arc, Mutex};

use sdkwork_clawrouter_router_service::application::{
    UsageSettlementWorker, UsageSettlementWorkerConfig,
};
use sdkwork_clawrouter_router_service::domain::DomainResult;
use sdkwork_clawrouter_router_service::ports::{
    UsageSettlementCommand, UsageSettlementFuture, UsageSettlementOutcome, UsageSettlementStore,
};

const SETTLEMENT_BATCH_HARD_LIMIT: i64 = 200;

#[tokio::test]
async fn usage_settlement_worker_run_once_builds_batch_command_for_all_tenants() {
    let store = Arc::new(RecordingSettlementStore::new(UsageSettlementOutcome {
        settled_count: 2,
        failed_count: 1,
        debited_points: 120,
    }));
    let worker = UsageSettlementWorker::new(
        store.clone(),
        UsageSettlementWorkerConfig {
            enabled: true,
            tenant_id: 0,
            organization_id: 0,
            batch_size: 25,
            interval_millis: 10_000,
        },
    );

    let outcome = worker.run_once().await.unwrap();

    assert_eq!(2, outcome.settled_count);
    assert_eq!(1, outcome.failed_count);
    assert_eq!(120, outcome.debited_points);
    let commands = store.commands.lock().unwrap();
    assert_eq!(1, commands.len());
    assert_eq!(0, commands[0].tenant_id);
    assert_eq!(0, commands[0].organization_id);
    assert_eq!(25, commands[0].limit);
    assert_eq!(19, commands[0].requested_at.len());
    assert!(commands[0].requested_at.contains('-'));
    assert!(commands[0].requested_at.contains(':'));
}

#[tokio::test]
async fn usage_settlement_worker_skips_disabled_run_without_touching_store() {
    let store = Arc::new(RecordingSettlementStore::new(UsageSettlementOutcome {
        settled_count: 1,
        failed_count: 0,
        debited_points: 10,
    }));
    let worker = UsageSettlementWorker::new(
        store.clone(),
        UsageSettlementWorkerConfig {
            enabled: false,
            tenant_id: 100001,
            organization_id: 0,
            batch_size: 50,
            interval_millis: 10_000,
        },
    );

    let outcome = worker.run_once().await.unwrap();

    assert_eq!(0, outcome.settled_count);
    assert_eq!(0, outcome.failed_count);
    assert_eq!(0, outcome.debited_points);
    assert!(store.commands.lock().unwrap().is_empty());
}

#[tokio::test]
async fn usage_settlement_worker_clamps_directly_constructed_oversized_batches() {
    let store = Arc::new(RecordingSettlementStore::new(UsageSettlementOutcome {
        settled_count: 0,
        failed_count: 0,
        debited_points: 0,
    }));
    let worker = UsageSettlementWorker::new(
        store.clone(),
        UsageSettlementWorkerConfig {
            enabled: true,
            tenant_id: 100001,
            organization_id: 0,
            batch_size: SETTLEMENT_BATCH_HARD_LIMIT + 1,
            interval_millis: 10_000,
        },
    );

    worker.run_once().await.unwrap();

    assert_eq!(SETTLEMENT_BATCH_HARD_LIMIT, worker.config().batch_size);
    assert_eq!(
        SETTLEMENT_BATCH_HARD_LIMIT,
        store.commands.lock().unwrap()[0].limit
    );
}

#[derive(Debug)]
struct RecordingSettlementStore {
    commands: Mutex<Vec<UsageSettlementCommand>>,
    outcome: UsageSettlementOutcome,
}

impl RecordingSettlementStore {
    fn new(outcome: UsageSettlementOutcome) -> Self {
        Self {
            commands: Mutex::new(Vec::new()),
            outcome,
        }
    }
}

impl UsageSettlementStore for RecordingSettlementStore {
    fn settle_pending_usage<'a>(
        &'a self,
        command: UsageSettlementCommand,
    ) -> UsageSettlementFuture<'a> {
        Box::pin(async move {
            self.commands.lock().unwrap().push(command);
            DomainResult::Ok(self.outcome.clone())
        })
    }
}
