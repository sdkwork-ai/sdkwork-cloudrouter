use std::fmt::{Display, Formatter};
use std::future::Future;
use std::pin::Pin;

use super::AdminUpstreamSubject;

pub type AdminUpstreamAccountVerificationFuture<'a> =
    Pin<Box<dyn Future<Output = AdminUpstreamAccountVerificationResult> + Send + 'a>>;

pub type AdminUpstreamAccountVerificationResult =
    Result<AdminUpstreamAccountVerificationItem, AdminUpstreamAccountVerificationError>;

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum AdminUpstreamAccountVerificationError {
    TargetNotFound,
    UnsupportedProtocol,
    UnsupportedAuthType,
    InvalidConfiguration,
    Internal,
}

impl Display for AdminUpstreamAccountVerificationError {
    fn fmt(&self, formatter: &mut Formatter<'_>) -> std::fmt::Result {
        formatter.write_str(match self {
            Self::TargetNotFound => {
                "active upstream account verification target, endpoint, or credential was not found"
            }
            Self::UnsupportedProtocol => "upstream account verification protocol is not supported",
            Self::UnsupportedAuthType => {
                "upstream account verification authentication type is not supported"
            }
            Self::InvalidConfiguration => "upstream account verification configuration is invalid",
            Self::Internal => "upstream account verification failed internally",
        })
    }
}

impl std::error::Error for AdminUpstreamAccountVerificationError {}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct VerifyAdminUpstreamAccountCommand {
    pub subject: AdminUpstreamSubject,
    pub account_id: i64,
    pub endpoint_id: Option<i64>,
    pub credential_id: Option<i64>,
    pub timeout_ms: u64,
    pub requested_at: String,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct AdminUpstreamAccountVerificationItem {
    pub account_id: i64,
    pub supplier_code: String,
    pub endpoint_id: i64,
    pub credential_id: i64,
    pub success: bool,
    pub status_code: Option<u16>,
    pub latency_ms: u64,
    pub verified_at: String,
    pub message: String,
}

pub trait AdminUpstreamAccountVerifier: Send + Sync {
    fn verify_account<'a>(
        &'a self,
        command: VerifyAdminUpstreamAccountCommand,
    ) -> AdminUpstreamAccountVerificationFuture<'a>;
}
