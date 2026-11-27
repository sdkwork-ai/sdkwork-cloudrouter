//! Decoupled relay recharge capability for Cloud Router.
//!
//! Cloud Router relays (including Cloud Router deployments used as a
//! supplier) expose an API-key recharge surface. This crate owns the shared
//! wire contract and the pure HTTP client so that:
//!
//! - the Cloud Router Open API serves exactly the contract clients parse;
//! - the management API can query a relay's balance/options and create orders
//!   without importing UI, database, or credential concerns;
//! - each caller supplies a [`RechargeConnection`] resolved elsewhere.
//!
//! No module in this crate opens a database connection or reads process
//! configuration.

#![forbid(unsafe_code)]

pub mod client;
pub mod contract;
pub mod error;

pub use client::{
    normalize_origin, validate_custom_amount, HttpUpstreamRechargeClient, RechargeConnection,
    UpstreamRechargeClient, DEFAULT_RECHARGE_TIMEOUT,
};
pub use contract::{
    validate_amount, RechargeBalance, RechargeContractError, RechargeOption, RechargeOptions,
    RechargeOrder, RechargeOrderRequest, MAX_RECHARGE_AMOUNT,
};
pub use error::RechargeClientError;
