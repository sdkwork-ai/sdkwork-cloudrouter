use crate::context_mapper::validate_incoming_metadata;
use tonic::{Request, Status};

pub fn commerce_rpc_request_interceptor<T>(request: Request<T>) -> Result<Request<T>, Status> {
    validate_incoming_metadata(request.metadata())
        .map_err(crate::error_mapper::map_commerce_service_error)?;
    Ok(request)
}
