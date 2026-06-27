use sdkwork_commerce_contract_service::{
    CapabilityFlag, CommerceIdempotencyRecord, CommerceRequestHash, CommerceRuntimeContext,
    CommerceRuntimeContextInput, CommerceServiceError, CommerceSurfaceProfile, DeploymentMode,
    Environment, OperationExecutionPolicy,
};
use sdkwork_commerce_service_host::{
    execute_runtime_operation, execute_runtime_operation_enveloped, execute_with_idempotency,
    execute_with_transaction, first_slice_service_contracts, operation_contracts,
    operation_service_bindings, prepare_operation_execution, resolve_operation_contract,
    CommerceAccountRuntimeHandler, CommerceAccountRuntimeStore, CommerceRuntimeExecutionOutcome,
    CommerceRuntimeIdempotencyStore, CommerceRuntimeOperationErrorEnvelope,
    CommerceRuntimeOperationInput, CommerceRuntimeOperationOutput, CommerceRuntimeServiceHandler,
    CommerceRuntimeServiceRegistry, CommerceRuntimeServiceRequest,
    CommerceRuntimeTransactionManager,
};

#[test]
fn business_domain_crates_expose_reusable_service_contracts() {
    let contracts = vec![
        sdkwork_commerce_shop_service::shop_service_contract(),
        sdkwork_commerce_account_service::account_service_contract(),
        sdkwork_commerce_catalog_service::catalog_service_contract(),
        sdkwork_commerce_inventory_service::inventory_service_contract(),
        sdkwork_commerce_promotion_service::promotion_service_contract(),
        sdkwork_commerce_order_service::order_service_contract(),
        sdkwork_commerce_payment_service::payment_service_contract(),
        sdkwork_commerce_membership_service::membership_service_contract(),
        sdkwork_commerce_invoice_service::invoice_service_contract(),
    ];

    assert_eq!(
        contracts
            .iter()
            .map(|contract| contract.domain)
            .collect::<Vec<_>>(),
        vec![
            "shop",
            "account",
            "catalog",
            "inventory",
            "promotion",
            "order",
            "payment",
            "membership",
            "invoice"
        ],
    );

    for contract in contracts {
        assert_eq!(contract.validate(), Ok(()));
        assert!(contract.service_name.starts_with("commerce."));
        assert!(!contract.write_commands.is_empty());
        assert!(!contract.read_queries.is_empty());
        assert!(!contract.ports.is_empty());
        assert!(
            contract.requires_idempotency_for_writes,
            "commerce write commands must be idempotency guarded: {}",
            contract.service_name,
        );
    }
}

#[test]
fn runtime_composes_first_slice_service_contracts_in_domain_order() {
    let contracts = first_slice_service_contracts();

    assert_eq!(
        contracts
            .iter()
            .map(|contract| contract.service_name)
            .collect::<Vec<_>>(),
        vec![
            "commerce.shop",
            "commerce.account",
            "commerce.catalog",
            "commerce.inventory",
            "commerce.promotion",
            "commerce.order",
            "commerce.payment",
            "commerce.membership",
            "commerce.invoice",
        ],
    );
}

#[test]
fn app_operation_ids_are_bound_to_their_runtime_services() {
    let bindings = operation_service_bindings();

    assert_eq!(
        bindings
            .iter()
            .find(|binding| binding.operation_id == "shops.current.applications.create")
            .map(|binding| binding.service_name),
        Some("commerce.shop"),
    );
    assert_eq!(
        bindings
            .iter()
            .find(|binding| binding.operation_id == "shops.current.channels.update")
            .map(|binding| binding.service_name),
        Some("commerce.shop"),
    );
    assert_eq!(
        bindings
            .iter()
            .find(|binding| binding.operation_id == "shops.settlementProfile.approve")
            .map(|binding| binding.service_name),
        Some("commerce.shop"),
    );
    assert_eq!(
        bindings
            .iter()
            .find(|binding| binding.operation_id == "shops.current.retrieve")
            .map(|binding| binding.service_name),
        Some("commerce.shop"),
    );
    assert_eq!(
        bindings
            .iter()
            .find(|binding| binding.operation_id == "shops.current.products.create")
            .map(|binding| binding.service_name),
        Some("commerce.shop"),
    );
    assert_eq!(
        bindings
            .iter()
            .find(|binding| binding.operation_id == "shops.current.orders.fulfillments.create")
            .map(|binding| binding.service_name),
        Some("commerce.shop"),
    );
    assert_eq!(
        bindings
            .iter()
            .find(|binding| binding.operation_id == "catalog.products.list")
            .map(|binding| binding.service_name),
        Some("commerce.catalog"),
    );
    assert_eq!(
        bindings
            .iter()
            .find(|binding| binding.operation_id == "catalog.spus.list")
            .map(|binding| binding.service_name),
        Some("commerce.catalog"),
    );
    assert_eq!(
        bindings
            .iter()
            .find(|binding| binding.operation_id == "catalog.skus.retrieve")
            .map(|binding| binding.service_name),
        Some("commerce.catalog"),
    );
    assert_eq!(
        bindings
            .iter()
            .find(|binding| binding.operation_id == "inventory.stocks.list")
            .map(|binding| binding.service_name),
        Some("commerce.inventory"),
    );
    assert_eq!(
        bindings
            .iter()
            .find(|binding| binding.operation_id == "inventory.stocks.update")
            .map(|binding| binding.service_name),
        Some("commerce.inventory"),
    );
    assert_eq!(
        bindings
            .iter()
            .find(|binding| binding.operation_id == "accounts.current.summary.retrieve")
            .map(|binding| binding.service_name),
        Some("commerce.account"),
    );
    assert_eq!(
        bindings
            .iter()
            .find(|binding| binding.operation_id == "wallet.tokens.retrieve")
            .map(|binding| binding.service_name),
        Some("commerce.account"),
    );
    assert_eq!(
        bindings
            .iter()
            .find(|binding| binding.operation_id == "promotions.codes.redemptions.create")
            .map(|binding| binding.service_name),
        Some("commerce.promotion"),
    );
    assert_eq!(
        bindings
            .iter()
            .find(|binding| binding.operation_id == "wallet.points.exchangeRules.list")
            .map(|binding| binding.service_name),
        Some("commerce.promotion"),
    );
    assert_eq!(
        bindings
            .iter()
            .find(|binding| binding.operation_id == "wallet.exchangeRate.retrieve")
            .map(|binding| binding.service_name),
        Some("commerce.promotion"),
    );
    assert_eq!(
        bindings
            .iter()
            .find(|binding| binding.operation_id == "wallet.transactions.list")
            .map(|binding| binding.service_name),
        Some("commerce.account"),
    );
    assert_eq!(
        bindings
            .iter()
            .find(|binding| binding.operation_id == "memberships.purchases.create")
            .map(|binding| binding.service_name),
        Some("commerce.membership"),
    );
    assert_eq!(
        bindings
            .iter()
            .find(|binding| binding.operation_id == "wallet.adjustments.create")
            .map(|binding| binding.service_name),
        Some("commerce.account"),
    );
    assert_eq!(
        bindings
            .iter()
            .find(|binding| binding.operation_id == "addresses.create")
            .map(|binding| binding.service_name),
        Some("commerce.catalog"),
    );
    assert_eq!(
        bindings
            .iter()
            .find(|binding| binding.operation_id == "wallet.exchangeRate.retrieve")
            .map(|binding| binding.service_name),
        Some("commerce.promotion"),
    );
    assert_eq!(
        bindings
            .iter()
            .find(|binding| binding.operation_id == "checkout.sessions.orders.create")
            .map(|binding| binding.service_name),
        Some("commerce.order"),
    );
    for operation_id in [
        "afterSales.requests.create",
        "afterSales.returnShipments.create",
        "afterSales.reviews.create",
        "afterSales.events.list",
    ] {
        assert_eq!(
            bindings
                .iter()
                .find(|binding| binding.operation_id == operation_id)
                .map(|binding| binding.service_name),
            Some("commerce.order"),
            "after-sales operation must be bound to commerce.order: {operation_id}",
        );
    }
    for operation_id in [
        "shipments.packages.list",
        "shipments.packages.management.list",
        "shipments.packages.create",
        "shipments.packages.update",
    ] {
        assert_eq!(
            bindings
                .iter()
                .find(|binding| binding.operation_id == operation_id)
                .map(|binding| binding.service_name),
            Some("commerce.order"),
            "shipment package operation must be bound to commerce.order: {operation_id}",
        );
    }
    assert_eq!(
        bindings
            .iter()
            .find(|binding| binding.operation_id == "orders.create")
            .map(|binding| binding.service_name),
        Some("commerce.order"),
    );
    assert_eq!(
        bindings
            .iter()
            .find(|binding| binding.operation_id == "payments.attempts.retrieve")
            .map(|binding| binding.service_name),
        Some("commerce.payment"),
    );
    assert_eq!(
        bindings
            .iter()
            .find(|binding| binding.operation_id == "reports.commerceOverview.retrieve")
            .map(|binding| binding.service_name),
        Some("commerce.order"),
    );
    let unique_operation_ids = bindings
        .iter()
        .map(|binding| binding.operation_id)
        .collect::<std::collections::HashSet<_>>();
    assert_eq!(unique_operation_ids.len(), bindings.len());
    for retired_operation_id in [
        "catalog.spu.list",
        "catalog.spu.retrieve",
        "catalog.spu.create",
        "catalog.spu.update",
        "wallet.topups.create",
        "wallet.tokens.deductions.create",
        "checkout.preflight.estimates.create",
    ] {
        assert!(
            bindings
                .iter()
                .all(|binding| binding.operation_id != retired_operation_id),
            "retired operation binding must not be registered: {retired_operation_id}"
        );
    }
}

#[test]
fn runtime_exposes_operation_contracts_for_every_app_operation() {
    let bindings = operation_service_bindings();
    let contracts = operation_contracts();

    assert_eq!(contracts.len(), bindings.len());
    for binding in bindings {
        let contract = contracts
            .iter()
            .find(|contract| contract.operation_id == binding.operation_id)
            .expect("operation binding must have an execution contract");

        assert_eq!(contract.service_name, binding.service_name);
        assert_eq!(contract.validate(), Ok(()));
    }
}

#[test]
fn runtime_marks_write_operations_as_idempotent_transactional_boundaries() {
    let create_order = resolve_operation_contract("checkout.sessions.orders.create").unwrap();
    let create_payment = resolve_operation_contract("payments.intents.create").unwrap();
    let create_after_sales = resolve_operation_contract("afterSales.requests.create").unwrap();
    let review_after_sales = resolve_operation_contract("afterSales.reviews.create").unwrap();
    let list_after_sales_events = resolve_operation_contract("afterSales.events.list").unwrap();
    let publish_shop_product =
        resolve_operation_contract("shops.current.products.publish").unwrap();
    let create_shipment_package = resolve_operation_contract("shipments.packages.create").unwrap();
    let update_shipment_package = resolve_operation_contract("shipments.packages.update").unwrap();
    let list_shipment_packages = resolve_operation_contract("shipments.packages.list").unwrap();
    let list_managed_shipment_packages =
        resolve_operation_contract("shipments.packages.management.list").unwrap();
    let account_summary = resolve_operation_contract("accounts.current.summary.retrieve").unwrap();

    assert_eq!(
        create_order.execution_policy,
        OperationExecutionPolicy::TransactionalWrite,
    );
    assert_eq!(
        create_payment.execution_policy,
        OperationExecutionPolicy::TransactionalWrite,
    );
    assert!(create_order.requires_idempotency());
    assert!(create_order.requires_transaction());
    assert!(create_payment.requires_idempotency());
    assert!(create_payment.requires_transaction());
    for contract in [&create_after_sales, &review_after_sales] {
        assert_eq!(
            contract.execution_policy,
            OperationExecutionPolicy::TransactionalWrite,
        );
        assert!(contract.requires_idempotency());
        assert!(contract.requires_transaction());
        assert_eq!(contract.service_name, "commerce.order");
        assert_eq!(contract.capability_name, "commerce.order.afterSales");
    }
    assert_eq!(
        list_after_sales_events.execution_policy,
        OperationExecutionPolicy::ReadOnly
    );
    assert!(!list_after_sales_events.requires_idempotency());
    assert!(!list_after_sales_events.requires_transaction());
    assert_eq!(list_after_sales_events.service_name, "commerce.order");
    assert_eq!(
        list_after_sales_events.capability_name,
        "commerce.order.afterSales"
    );
    assert_eq!(
        publish_shop_product.execution_policy,
        OperationExecutionPolicy::TransactionalWrite,
    );
    assert!(publish_shop_product.requires_idempotency());
    assert!(publish_shop_product.requires_transaction());
    assert_eq!(
        publish_shop_product.capability_name,
        "commerce.shop.catalog"
    );
    for contract in [&create_shipment_package, &update_shipment_package] {
        assert_eq!(
            contract.execution_policy,
            OperationExecutionPolicy::TransactionalWrite,
        );
        assert!(contract.requires_idempotency());
        assert!(contract.requires_transaction());
        assert_eq!(contract.service_name, "commerce.order");
        assert_eq!(contract.capability_name, "commerce.order.fulfillment");
    }

    for contract in [&list_shipment_packages, &list_managed_shipment_packages] {
        assert_eq!(
            contract.execution_policy,
            OperationExecutionPolicy::ReadOnly
        );
        assert!(!contract.requires_idempotency());
        assert!(!contract.requires_transaction());
        assert_eq!(contract.service_name, "commerce.order");
        assert_eq!(contract.capability_name, "commerce.order.fulfillment");
    }

    assert_eq!(
        account_summary.execution_policy,
        OperationExecutionPolicy::ReadOnly,
    );
    assert!(!account_summary.requires_idempotency());
    assert!(!account_summary.requires_transaction());
    assert_eq!(account_summary.capability_name, "commerce.account.summary");
}

#[test]
fn unknown_operation_contracts_fail_with_not_found_error() {
    let error = resolve_operation_contract("missing.operation").unwrap_err();

    assert_eq!(error.code(), "not-found");
    assert_eq!(error.message(), "commerce operation is not registered");
}

#[test]
fn runtime_prepares_standard_execution_plan_before_service_dispatch() {
    let context = runtime_context();
    let capabilities = vec![CapabilityFlag::new("commerce.order.lifecycle", true).unwrap()];
    let plan = prepare_operation_execution(
        context,
        "checkout.sessions.orders.create",
        Some("idem-order-1"),
        Some(CommerceRequestHash::new("hash-order-1").unwrap()),
        &capabilities,
    )
    .unwrap();

    assert_eq!(plan.operation_id, "checkout.sessions.orders.create");
    assert_eq!(plan.service_name, "commerce.order");
    assert_eq!(
        plan.idempotency_scope,
        Some("checkout.sessions.orders.create")
    );
    assert_eq!(
        plan.execution_policy,
        OperationExecutionPolicy::TransactionalWrite
    );
    assert!(plan.requires_transaction);
}

#[test]
fn runtime_rejects_write_execution_without_idempotency_before_dispatch() {
    let error = prepare_operation_execution(
        runtime_context(),
        "payments.intents.create",
        None,
        Some(CommerceRequestHash::new("hash-payment-1").unwrap()),
        &[CapabilityFlag::new("commerce.payment.intent", true).unwrap()],
    )
    .unwrap_err();

    assert_eq!(
        error,
        CommerceServiceError::validation("idempotency_key is required for write operation"),
    );
}

#[test]
fn runtime_rejects_disabled_capabilities_before_dispatch() {
    let error = prepare_operation_execution(
        runtime_context(),
        "memberships.purchases.create",
        Some("idem-membership-1"),
        Some(CommerceRequestHash::new("hash-membership-1").unwrap()),
        &[CapabilityFlag::new("commerce.membership.purchase", false).unwrap()],
    )
    .unwrap_err();

    assert_eq!(
        error,
        CommerceServiceError::unsupported_capability("required commerce capability is disabled",),
    );
}

#[test]
fn runtime_dispatches_prepared_execution_plans_to_registered_domain_services() {
    let capabilities = vec![CapabilityFlag::new("commerce.order.lifecycle", true).unwrap()];
    let plan = prepare_operation_execution(
        runtime_context(),
        "checkout.sessions.orders.create",
        Some("idem-order-1"),
        Some(CommerceRequestHash::new("hash-order-1").unwrap()),
        &capabilities,
    )
    .unwrap();
    let request = CommerceRuntimeServiceRequest::new(plan, "{\"items\":[]}");
    let registry = CommerceRuntimeServiceRegistry::new().register(Box::new(
        StaticServiceHandler::new("commerce.order", "{\"orderId\":\"order-1\"}"),
    ));

    let response = registry.dispatch(&request).unwrap();

    assert_eq!(response.operation_id, "checkout.sessions.orders.create");
    assert_eq!(response.service_name, "commerce.order");
    assert_eq!(response.body_json, "{\"orderId\":\"order-1\"}");
    assert!(response.idempotency_scope.is_some());
}

#[test]
fn account_runtime_handler_delegates_wallet_operations_to_storage_agnostic_store() {
    let capabilities = vec![CapabilityFlag::new("commerce.account.wallet", true).unwrap()];
    let plan = prepare_operation_execution(
        runtime_context(),
        "wallet.accounts.list",
        None,
        None,
        &capabilities,
    )
    .unwrap();
    let request = CommerceRuntimeServiceRequest::new(plan, "{}");
    let registry = CommerceRuntimeServiceRegistry::new().register(Box::new(
        CommerceAccountRuntimeHandler::new(RecordingAccountRuntimeStore),
    ));

    let response = registry.dispatch(&request).unwrap();

    assert_eq!(response.operation_id, "wallet.accounts.list");
    assert_eq!(response.service_name, "commerce.account");
    assert_eq!(
        response.body_json,
        "{\"handledBy\":\"commerce.account\",\"operationId\":\"wallet.accounts.list\"}",
    );
}

#[test]
fn runtime_dispatch_rejects_unregistered_domain_services() {
    let capabilities = vec![CapabilityFlag::new("commerce.payment.intent", true).unwrap()];
    let plan = prepare_operation_execution(
        runtime_context(),
        "payments.intents.create",
        Some("idem-payment-1"),
        Some(CommerceRequestHash::new("hash-payment-1").unwrap()),
        &capabilities,
    )
    .unwrap();
    let request = CommerceRuntimeServiceRequest::new(plan, "{}");
    let error = CommerceRuntimeServiceRegistry::new()
        .dispatch(&request)
        .unwrap_err();

    assert_eq!(error.code(), "unsupported-capability");
    assert_eq!(
        error.message(),
        "commerce runtime service is not registered"
    );
}

#[test]
fn runtime_replays_completed_idempotent_write_execution_without_dispatching_service() {
    let request_hash = CommerceRequestHash::new("hash-order-1").unwrap();
    let mut store =
        InMemoryIdempotencyStore::new().with_record(CommerceIdempotencyRecord::completed(
            "100001",
            "checkout.sessions.orders.create",
            "idem-order-1",
            request_hash.clone(),
            "{\"orderId\":\"order-previous\"}",
        ));
    let request = service_request(
        "checkout.sessions.orders.create",
        Some("idem-order-1"),
        Some(request_hash),
        "commerce.order.lifecycle",
    );
    let registry = CommerceRuntimeServiceRegistry::new().register(Box::new(
        StaticServiceHandler::new("commerce.order", "{\"orderId\":\"new\"}"),
    ));

    let outcome = execute_with_idempotency(&registry, &mut store, &request).unwrap();

    assert_eq!(
        outcome,
        CommerceRuntimeExecutionOutcome::Replayed("{\"orderId\":\"order-previous\"}".to_string()),
    );
    assert_eq!(store.locked_count, 0);
    assert_eq!(store.completed_count, 0);
}

#[test]
fn runtime_rejects_idempotency_hash_conflicts_before_dispatching_service() {
    let mut store =
        InMemoryIdempotencyStore::new().with_record(CommerceIdempotencyRecord::completed(
            "100001",
            "checkout.sessions.orders.create",
            "idem-order-1",
            CommerceRequestHash::new("hash-a").unwrap(),
            "{\"orderId\":\"order-previous\"}",
        ));
    let request = service_request(
        "checkout.sessions.orders.create",
        Some("idem-order-1"),
        Some(CommerceRequestHash::new("hash-b").unwrap()),
        "commerce.order.lifecycle",
    );
    let registry = CommerceRuntimeServiceRegistry::new().register(Box::new(
        StaticServiceHandler::new("commerce.order", "{\"orderId\":\"new\"}"),
    ));
    let error = execute_with_idempotency(&registry, &mut store, &request).unwrap_err();

    assert_eq!(error.code(), "conflict");
    assert_eq!(
        error.message(),
        "idempotency key was reused with a different request hash"
    );
    assert_eq!(store.locked_count, 0);
}

#[test]
fn runtime_locks_and_completes_new_idempotent_write_execution() {
    let mut store = InMemoryIdempotencyStore::new();
    let request = service_request(
        "checkout.sessions.orders.create",
        Some("idem-order-1"),
        Some(CommerceRequestHash::new("hash-order-1").unwrap()),
        "commerce.order.lifecycle",
    );
    let registry = CommerceRuntimeServiceRegistry::new().register(Box::new(
        StaticServiceHandler::new("commerce.order", "{\"orderId\":\"order-1\"}"),
    ));

    let outcome = execute_with_idempotency(&registry, &mut store, &request).unwrap();

    assert_eq!(
        outcome,
        CommerceRuntimeExecutionOutcome::Executed("{\"orderId\":\"order-1\"}".to_string()),
    );
    assert_eq!(store.locked_count, 1);
    assert_eq!(store.completed_count, 1);
    assert_eq!(
        store.records[0].response_json.as_deref(),
        Some("{\"orderId\":\"order-1\"}"),
    );
}

#[test]
fn runtime_executes_transactional_writes_inside_a_transaction_boundary() {
    let mut store = InMemoryIdempotencyStore::new();
    let mut transactions = RecordingTransactionManager::default();
    let request = service_request(
        "checkout.sessions.orders.create",
        Some("idem-order-1"),
        Some(CommerceRequestHash::new("hash-order-1").unwrap()),
        "commerce.order.lifecycle",
    );
    let registry = CommerceRuntimeServiceRegistry::new().register(Box::new(
        StaticServiceHandler::new("commerce.order", "{\"orderId\":\"order-1\"}"),
    ));

    let outcome =
        execute_with_transaction(&registry, &mut store, &mut transactions, &request).unwrap();

    assert_eq!(
        outcome,
        CommerceRuntimeExecutionOutcome::Executed("{\"orderId\":\"order-1\"}".to_string()),
    );
    assert_eq!(
        transactions.events,
        vec![
            "begin:checkout.sessions.orders.create",
            "commit:checkout.sessions.orders.create"
        ]
    );
    assert_eq!(store.locked_count, 1);
    assert_eq!(store.completed_count, 1);
    assert_eq!(store.failed_count, 0);
}

#[test]
fn runtime_rolls_back_and_marks_idempotency_failed_when_transactional_dispatch_fails() {
    let mut store = InMemoryIdempotencyStore::new();
    let mut transactions = RecordingTransactionManager::default();
    let request = service_request(
        "checkout.sessions.orders.create",
        Some("idem-order-1"),
        Some(CommerceRequestHash::new("hash-order-1").unwrap()),
        "commerce.order.lifecycle",
    );
    let registry = CommerceRuntimeServiceRegistry::new()
        .register(Box::new(FailingServiceHandler::new("commerce.order")));
    let error =
        execute_with_transaction(&registry, &mut store, &mut transactions, &request).unwrap_err();

    assert_eq!(error.code(), "storage");
    assert_eq!(error.message(), "domain service failed");
    assert_eq!(
        transactions.events,
        vec![
            "begin:checkout.sessions.orders.create",
            "rollback:checkout.sessions.orders.create"
        ]
    );
    assert_eq!(store.locked_count, 1);
    assert_eq!(store.completed_count, 0);
    assert_eq!(store.failed_count, 1);
    assert_eq!(
        store.records[0].status,
        sdkwork_commerce_contract_service::IdempotencyStatus::Failed
    );
}

#[test]
fn runtime_does_not_open_transactions_for_replayed_or_read_only_execution() {
    let request_hash = CommerceRequestHash::new("hash-order-1").unwrap();
    let mut store =
        InMemoryIdempotencyStore::new().with_record(CommerceIdempotencyRecord::completed(
            "100001",
            "checkout.sessions.orders.create",
            "idem-order-1",
            request_hash.clone(),
            "{\"orderId\":\"order-previous\"}",
        ));
    let mut transactions = RecordingTransactionManager::default();
    let replay_request = service_request(
        "checkout.sessions.orders.create",
        Some("idem-order-1"),
        Some(request_hash),
        "commerce.order.lifecycle",
    );
    let read_request = service_request(
        "accounts.current.summary.retrieve",
        None,
        None,
        "commerce.account.summary",
    );
    let registry = CommerceRuntimeServiceRegistry::new()
        .register(Box::new(StaticServiceHandler::new(
            "commerce.order",
            "{\"orderId\":\"new\"}",
        )))
        .register(Box::new(StaticServiceHandler::new(
            "commerce.account",
            "{\"balance\":\"0\"}",
        )));

    assert_eq!(
        execute_with_transaction(&registry, &mut store, &mut transactions, &replay_request)
            .unwrap(),
        CommerceRuntimeExecutionOutcome::Replayed("{\"orderId\":\"order-previous\"}".to_string()),
    );
    assert_eq!(
        execute_with_transaction(&registry, &mut store, &mut transactions, &read_request).unwrap(),
        CommerceRuntimeExecutionOutcome::Executed("{\"balance\":\"0\"}".to_string()),
    );

    assert!(transactions.events.is_empty());
}

#[test]
fn runtime_operation_entrypoint_executes_transactional_write_operations() {
    let mut store = InMemoryIdempotencyStore::new();
    let mut transactions = RecordingTransactionManager::default();
    let registry = CommerceRuntimeServiceRegistry::new().register(Box::new(
        StaticServiceHandler::new("commerce.order", "{\"orderId\":\"order-1\"}"),
    ));
    let input = CommerceRuntimeOperationInput::new(
        runtime_context(),
        "checkout.sessions.orders.create",
        "{\"items\":[]}",
        vec![CapabilityFlag::new("commerce.order.lifecycle", true).unwrap()],
        Some("idem-order-1"),
        Some(CommerceRequestHash::new("hash-order-1").unwrap()),
    );

    let output =
        execute_runtime_operation(&registry, &mut store, &mut transactions, input).unwrap();

    assert_eq!(
        output,
        CommerceRuntimeOperationOutput {
            operation_id: "checkout.sessions.orders.create",
            service_name: "commerce.order",
            body_json: "{\"orderId\":\"order-1\"}".to_string(),
            outcome: CommerceRuntimeExecutionOutcome::Executed(
                "{\"orderId\":\"order-1\"}".to_string(),
            ),
            idempotency_scope: Some("checkout.sessions.orders.create"),
        },
    );
    assert_eq!(
        transactions.events,
        vec![
            "begin:checkout.sessions.orders.create",
            "commit:checkout.sessions.orders.create"
        ]
    );
    assert_eq!(store.completed_count, 1);
}

#[test]
fn runtime_operation_entrypoint_replays_completed_write_operations() {
    let request_hash = CommerceRequestHash::new("hash-order-1").unwrap();
    let mut store =
        InMemoryIdempotencyStore::new().with_record(CommerceIdempotencyRecord::completed(
            "100001",
            "checkout.sessions.orders.create",
            "idem-order-1",
            request_hash.clone(),
            "{\"orderId\":\"order-previous\"}",
        ));
    let mut transactions = RecordingTransactionManager::default();
    let registry = CommerceRuntimeServiceRegistry::new().register(Box::new(
        StaticServiceHandler::new("commerce.order", "{\"orderId\":\"new\"}"),
    ));
    let input = CommerceRuntimeOperationInput::new(
        runtime_context(),
        "checkout.sessions.orders.create",
        "{}",
        vec![CapabilityFlag::new("commerce.order.lifecycle", true).unwrap()],
        Some("idem-order-1"),
        Some(request_hash),
    );

    let output =
        execute_runtime_operation(&registry, &mut store, &mut transactions, input).unwrap();

    assert_eq!(output.body_json, "{\"orderId\":\"order-previous\"}");
    assert_eq!(
        output.outcome,
        CommerceRuntimeExecutionOutcome::Replayed("{\"orderId\":\"order-previous\"}".to_string()),
    );
    assert!(transactions.events.is_empty());
}

#[test]
fn runtime_operation_entrypoint_rejects_disabled_capabilities_before_dispatch() {
    let mut store = InMemoryIdempotencyStore::new();
    let mut transactions = RecordingTransactionManager::default();
    let registry = CommerceRuntimeServiceRegistry::new().register(Box::new(
        StaticServiceHandler::new("commerce.order", "{\"orderId\":\"new\"}"),
    ));
    let input = CommerceRuntimeOperationInput::new(
        runtime_context(),
        "checkout.sessions.orders.create",
        "{}",
        vec![CapabilityFlag::new("commerce.order.lifecycle", false).unwrap()],
        Some("idem-order-1"),
        Some(CommerceRequestHash::new("hash-order-1").unwrap()),
    );
    let error =
        execute_runtime_operation(&registry, &mut store, &mut transactions, input).unwrap_err();

    assert_eq!(error.code(), "unsupported-capability");
    assert_eq!(error.message(), "required commerce capability is disabled");
    assert!(transactions.events.is_empty());
    assert_eq!(store.locked_count, 0);
}

#[test]
fn runtime_operation_envelope_standardizes_successful_write_outputs() {
    let mut store = InMemoryIdempotencyStore::new();
    let mut transactions = RecordingTransactionManager::default();
    let registry = CommerceRuntimeServiceRegistry::new().register(Box::new(
        StaticServiceHandler::new("commerce.order", "{\"orderId\":\"order-1\"}"),
    ));
    let input = CommerceRuntimeOperationInput::new(
        runtime_context(),
        "checkout.sessions.orders.create",
        "{\"items\":[]}",
        vec![CapabilityFlag::new("commerce.order.lifecycle", true).unwrap()],
        Some("idem-order-1"),
        Some(CommerceRequestHash::new("hash-order-1").unwrap()),
    );

    let envelope =
        execute_runtime_operation_enveloped(&registry, &mut store, &mut transactions, input);

    assert!(envelope.ok);
    assert_eq!(envelope.operation_id, "checkout.sessions.orders.create");
    assert_eq!(envelope.service_name.as_deref(), Some("commerce.order"));
    assert_eq!(
        envelope.body_json.as_deref(),
        Some("{\"orderId\":\"order-1\"}")
    );
    assert_eq!(envelope.outcome_kind, Some("executed"));
    assert_eq!(
        envelope.outcome,
        Some(CommerceRuntimeExecutionOutcome::Executed(
            "{\"orderId\":\"order-1\"}".to_string(),
        )),
    );
    assert_eq!(
        envelope.idempotency_scope.as_deref(),
        Some("checkout.sessions.orders.create")
    );
    assert_eq!(envelope.error, None);
    assert_eq!(
        transactions.events,
        vec![
            "begin:checkout.sessions.orders.create",
            "commit:checkout.sessions.orders.create"
        ]
    );
    assert_eq!(store.completed_count, 1);
}

#[test]
fn runtime_operation_envelope_marks_replayed_idempotent_outputs() {
    let request_hash = CommerceRequestHash::new("hash-order-1").unwrap();
    let mut store =
        InMemoryIdempotencyStore::new().with_record(CommerceIdempotencyRecord::completed(
            "100001",
            "checkout.sessions.orders.create",
            "idem-order-1",
            request_hash.clone(),
            "{\"orderId\":\"order-previous\"}",
        ));
    let mut transactions = RecordingTransactionManager::default();
    let registry = CommerceRuntimeServiceRegistry::new().register(Box::new(
        StaticServiceHandler::new("commerce.order", "{\"orderId\":\"new\"}"),
    ));
    let input = CommerceRuntimeOperationInput::new(
        runtime_context(),
        "checkout.sessions.orders.create",
        "{}",
        vec![CapabilityFlag::new("commerce.order.lifecycle", true).unwrap()],
        Some("idem-order-1"),
        Some(request_hash),
    );

    let envelope =
        execute_runtime_operation_enveloped(&registry, &mut store, &mut transactions, input);

    assert!(envelope.ok);
    assert_eq!(
        envelope.body_json.as_deref(),
        Some("{\"orderId\":\"order-previous\"}")
    );
    assert_eq!(envelope.outcome_kind, Some("replayed"));
    assert_eq!(
        envelope.outcome,
        Some(CommerceRuntimeExecutionOutcome::Replayed(
            "{\"orderId\":\"order-previous\"}".to_string(),
        )),
    );
    assert!(transactions.events.is_empty());
    assert_eq!(store.completed_count, 0);
}

#[test]
fn runtime_operation_envelope_standardizes_capability_errors_with_resolved_operation_metadata() {
    let mut store = InMemoryIdempotencyStore::new();
    let mut transactions = RecordingTransactionManager::default();
    let registry = CommerceRuntimeServiceRegistry::new().register(Box::new(
        StaticServiceHandler::new("commerce.order", "{\"orderId\":\"new\"}"),
    ));
    let input = CommerceRuntimeOperationInput::new(
        runtime_context(),
        "checkout.sessions.orders.create",
        "{}",
        vec![CapabilityFlag::new("commerce.order.lifecycle", false).unwrap()],
        Some("idem-order-1"),
        Some(CommerceRequestHash::new("hash-order-1").unwrap()),
    );

    let envelope =
        execute_runtime_operation_enveloped(&registry, &mut store, &mut transactions, input);

    assert!(!envelope.ok);
    assert_eq!(envelope.operation_id, "checkout.sessions.orders.create");
    assert_eq!(envelope.service_name.as_deref(), Some("commerce.order"));
    assert_eq!(envelope.body_json, None);
    assert_eq!(envelope.outcome, None);
    assert_eq!(envelope.outcome_kind, None);
    assert_eq!(
        envelope.idempotency_scope.as_deref(),
        Some("checkout.sessions.orders.create")
    );
    assert_eq!(
        envelope.error,
        Some(CommerceRuntimeOperationErrorEnvelope {
            code: "unsupported-capability",
            message: "required commerce capability is disabled".to_string(),
        }),
    );
    assert!(transactions.events.is_empty());
    assert_eq!(store.locked_count, 0);
}

#[test]
fn runtime_operation_envelope_standardizes_unknown_operation_errors() {
    let mut store = InMemoryIdempotencyStore::new();
    let mut transactions = RecordingTransactionManager::default();
    let registry = CommerceRuntimeServiceRegistry::new();
    let input = CommerceRuntimeOperationInput::new(
        runtime_context(),
        "missing.operation",
        "{}",
        Vec::new(),
        None,
        None,
    );

    let envelope =
        execute_runtime_operation_enveloped(&registry, &mut store, &mut transactions, input);

    assert!(!envelope.ok);
    assert_eq!(envelope.operation_id, "missing.operation");
    assert_eq!(envelope.service_name, None);
    assert_eq!(envelope.idempotency_scope, None);
    assert_eq!(
        envelope.error,
        Some(CommerceRuntimeOperationErrorEnvelope {
            code: "not-found",
            message: "commerce operation is not registered".to_string(),
        }),
    );
}

#[test]
fn runtime_operation_envelope_standardizes_domain_service_errors() {
    let mut store = InMemoryIdempotencyStore::new();
    let mut transactions = RecordingTransactionManager::default();
    let registry = CommerceRuntimeServiceRegistry::new()
        .register(Box::new(FailingServiceHandler::new("commerce.order")));
    let input = CommerceRuntimeOperationInput::new(
        runtime_context(),
        "checkout.sessions.orders.create",
        "{}",
        vec![CapabilityFlag::new("commerce.order.lifecycle", true).unwrap()],
        Some("idem-order-1"),
        Some(CommerceRequestHash::new("hash-order-1").unwrap()),
    );

    let envelope =
        execute_runtime_operation_enveloped(&registry, &mut store, &mut transactions, input);

    assert!(!envelope.ok);
    assert_eq!(envelope.operation_id, "checkout.sessions.orders.create");
    assert_eq!(envelope.service_name.as_deref(), Some("commerce.order"));
    assert_eq!(
        envelope.idempotency_scope.as_deref(),
        Some("checkout.sessions.orders.create")
    );
    assert_eq!(
        envelope.error,
        Some(CommerceRuntimeOperationErrorEnvelope {
            code: "storage",
            message: "domain service failed".to_string(),
        }),
    );
    assert_eq!(
        transactions.events,
        vec![
            "begin:checkout.sessions.orders.create",
            "rollback:checkout.sessions.orders.create"
        ]
    );
    assert_eq!(store.failed_count, 1);
}

#[derive(Clone, Debug)]
struct StaticServiceHandler {
    service_name: &'static str,
    body_json: &'static str,
}

#[derive(Clone, Debug)]
struct RecordingAccountRuntimeStore;

impl CommerceAccountRuntimeStore for RecordingAccountRuntimeStore {
    fn handle_account_operation(
        &self,
        request: &CommerceRuntimeServiceRequest,
    ) -> Result<String, CommerceServiceError> {
        Ok(format!(
            "{{\"handledBy\":\"{}\",\"operationId\":\"{}\"}}",
            request.execution_plan.service_name, request.execution_plan.operation_id
        ))
    }
}

impl StaticServiceHandler {
    fn new(service_name: &'static str, body_json: &'static str) -> Self {
        Self {
            service_name,
            body_json,
        }
    }
}

impl CommerceRuntimeServiceHandler for StaticServiceHandler {
    fn service_name(&self) -> &'static str {
        self.service_name
    }

    fn handle(
        &self,
        request: &CommerceRuntimeServiceRequest,
    ) -> Result<String, CommerceServiceError> {
        assert_eq!(request.execution_plan.service_name, self.service_name);
        Ok(self.body_json.to_string())
    }
}

#[derive(Clone, Debug)]
struct FailingServiceHandler {
    service_name: &'static str,
}

impl FailingServiceHandler {
    fn new(service_name: &'static str) -> Self {
        Self { service_name }
    }
}

impl CommerceRuntimeServiceHandler for FailingServiceHandler {
    fn service_name(&self) -> &'static str {
        self.service_name
    }

    fn handle(
        &self,
        _request: &CommerceRuntimeServiceRequest,
    ) -> Result<String, CommerceServiceError> {
        Err(CommerceServiceError::storage("domain service failed"))
    }
}

#[derive(Clone, Debug, Default)]
struct InMemoryIdempotencyStore {
    records: Vec<CommerceIdempotencyRecord>,
    locked_count: usize,
    completed_count: usize,
    failed_count: usize,
}

impl InMemoryIdempotencyStore {
    fn new() -> Self {
        Self::default()
    }

    fn with_record(mut self, record: CommerceIdempotencyRecord) -> Self {
        self.records.push(record);
        self
    }
}

impl CommerceRuntimeIdempotencyStore for InMemoryIdempotencyStore {
    fn find(
        &self,
        tenant_id: &str,
        scope: &str,
        idempotency_key: &str,
    ) -> Result<Option<CommerceIdempotencyRecord>, CommerceServiceError> {
        Ok(self
            .records
            .iter()
            .find(|record| {
                record.tenant_id == tenant_id
                    && record.scope == scope
                    && record.idempotency_key == idempotency_key
            })
            .cloned())
    }

    fn lock(
        &mut self,
        record: CommerceIdempotencyRecord,
    ) -> Result<CommerceIdempotencyRecord, CommerceServiceError> {
        self.locked_count += 1;
        self.records.push(record.clone());
        Ok(record)
    }

    fn complete(
        &mut self,
        tenant_id: &str,
        scope: &str,
        idempotency_key: &str,
        response_json: &str,
    ) -> Result<(), CommerceServiceError> {
        self.completed_count += 1;
        let record = self
            .records
            .iter_mut()
            .find(|record| {
                record.tenant_id == tenant_id
                    && record.scope == scope
                    && record.idempotency_key == idempotency_key
            })
            .unwrap();
        *record = record.clone().mark_completed(response_json);
        Ok(())
    }

    fn fail(
        &mut self,
        tenant_id: &str,
        scope: &str,
        idempotency_key: &str,
    ) -> Result<(), CommerceServiceError> {
        self.failed_count += 1;
        let record = self
            .records
            .iter_mut()
            .find(|record| {
                record.tenant_id == tenant_id
                    && record.scope == scope
                    && record.idempotency_key == idempotency_key
            })
            .unwrap();
        *record = record.clone().mark_failed();
        Ok(())
    }
}

#[derive(Clone, Debug, Default)]
struct RecordingTransactionManager {
    events: Vec<String>,
}

impl CommerceRuntimeTransactionManager for RecordingTransactionManager {
    fn begin(&mut self, operation_id: &str) -> Result<(), CommerceServiceError> {
        self.events.push(format!("begin:{operation_id}"));
        Ok(())
    }

    fn commit(&mut self, operation_id: &str) -> Result<(), CommerceServiceError> {
        self.events.push(format!("commit:{operation_id}"));
        Ok(())
    }

    fn rollback(&mut self, operation_id: &str) -> Result<(), CommerceServiceError> {
        self.events.push(format!("rollback:{operation_id}"));
        Ok(())
    }
}

fn service_request(
    operation_id: &str,
    idempotency_key: Option<&str>,
    request_hash: Option<CommerceRequestHash>,
    capability_name: &str,
) -> CommerceRuntimeServiceRequest {
    let capabilities = vec![CapabilityFlag::new(capability_name, true).unwrap()];
    let plan = prepare_operation_execution(
        runtime_context(),
        operation_id,
        idempotency_key,
        request_hash,
        &capabilities,
    )
    .unwrap();

    CommerceRuntimeServiceRequest::new(plan, "{}")
}

fn runtime_context() -> CommerceRuntimeContext {
    CommerceRuntimeContext::new(CommerceRuntimeContextInput {
        tenant_id: "100001".to_string(),
        organization_id: Some("300001".to_string()),
        user_id: "30".to_string(),
        session_id: "session-1".to_string(),
        app_id: "sdkwork-router".to_string(),
        deployment_mode: DeploymentMode::Private,
        environment: Environment::Production,
        surface_profile: CommerceSurfaceProfile::App,
    })
}
