//! Read-only billing decision diagnostics.
//!
//! Answers one question for a single request: was it admitted, what did the
//! account side freeze, was it settled, and is anything still stuck? The account
//! side owns every funding rule; this read model only assembles the facts a
//! support engineer needs, so it never mutates a wallet.

use std::future::Future;
use std::pin::Pin;

use crate::domain::DomainError;

pub type AdminBillingDecisionFuture<'a, T> =
    Pin<Box<dyn Future<Output = Result<T, DomainError>> + Send + 'a>>;

/// Tenant scope of a diagnostics read.
#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub struct AdminBillingDecisionSubject {
    pub tenant_id: i64,
}

/// Verdict of the four-stage snapshot.
#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum AdminBillingDecisionVerdict {
    /// No hold and no charge: the request never reached billing (rejected at
    /// admission, or it failed before dispatch).
    NotBilled,
    /// A hold exists but nothing was charged yet and it has not expired.
    Held,
    /// The hold outlived its TTL; the reconciliation sweep has not cleared it.
    Overdue,
    /// The hold was captured and usage was charged.
    Settled,
    /// The hold was released without a charge (failed or aborted request).
    Released,
    /// The hold expired and the funds were returned.
    Expired,
}

impl AdminBillingDecisionVerdict {
    pub fn as_str(self) -> &'static str {
        match self {
            Self::NotBilled => "not_billed",
            Self::Held => "held",
            Self::Overdue => "overdue",
            Self::Settled => "settled",
            Self::Released => "released",
            Self::Expired => "expired",
        }
    }
}

/// Four-stage snapshot of one request's billing.
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct AdminBillingDecision {
    pub invocation_id: String,
    /// Amount frozen by the account side, in token-bank points.
    pub hold_amount: Option<String>,
    /// Amount actually captured from the hold.
    pub hold_settled_amount: Option<String>,
    /// Raw hold status code (1 held, 2 settled, 3 released, 4 expired).
    pub hold_status: Option<i16>,
    pub hold_expires_at: Option<String>,
    /// Number of charge lines written for the request.
    pub charge_line_count: i64,
    /// Total charged amount in the pricing currency.
    pub charge_amount: String,
    /// Points debited by those charge lines.
    pub debit_points: i64,
    /// Total measured quantity across every meter of the request.
    pub measured_quantity: String,
    pub verdict: AdminBillingDecisionVerdict,
}

pub trait AdminBillingDecisionStore: Send + Sync {
    /// Reads the snapshot for one request inside one tenant.
    ///
    /// `Ok(None)` means the request id is unknown to this tenant; an unknown id
    /// from another tenant must not be distinguishable from a missing one.
    fn read_billing_decision<'a>(
        &'a self,
        subject: AdminBillingDecisionSubject,
        invocation_id: String,
    ) -> AdminBillingDecisionFuture<'a, Option<AdminBillingDecision>>;
}
