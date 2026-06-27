use sdkwork_commerce_contract_service::CommerceServiceError;
use sdkwork_rpc_core::{map_error_kind_to_code, SdkworkRpcErrorKind};
use tonic::Status;

pub fn map_commerce_service_error(error: CommerceServiceError) -> Status {
    let kind = match error.code() {
        "unauthenticated" => SdkworkRpcErrorKind::Unauthenticated,
        "unauthorized" => SdkworkRpcErrorKind::Unauthorized,
        "not-found" => SdkworkRpcErrorKind::NotFound,
        "conflict" => SdkworkRpcErrorKind::Conflict,
        "invalid-state" => SdkworkRpcErrorKind::InvalidState,
        "validation" => SdkworkRpcErrorKind::Validation,
        "transport" => SdkworkRpcErrorKind::ProviderUnavailable,
        "unsupported-capability" => SdkworkRpcErrorKind::UnsupportedCapability,
        "provider-unavailable" => SdkworkRpcErrorKind::ProviderUnavailable,
        "storage" => SdkworkRpcErrorKind::Storage,
        _ => SdkworkRpcErrorKind::Unknown,
    };

    Status::new(map_error_kind_to_code(kind), error.message().to_string())
}
