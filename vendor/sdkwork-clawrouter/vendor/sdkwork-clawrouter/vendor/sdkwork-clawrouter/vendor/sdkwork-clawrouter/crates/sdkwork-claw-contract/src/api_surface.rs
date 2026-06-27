use serde::{Deserialize, Serialize};

pub const APP_API_PREFIX: &str = "/app/v3/api";
pub const BACKEND_API_PREFIX: &str = "/backend/v3/api";
pub const OPENAI_V1_API_PREFIX: &str = "/v1";

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum ApiSurface {
    App,
    Backend,
    #[serde(rename = "openai_v1")]
    OpenAiV1,
}

impl ApiSurface {
    pub const fn api_prefix(self) -> &'static str {
        match self {
            Self::App => APP_API_PREFIX,
            Self::Backend => BACKEND_API_PREFIX,
            Self::OpenAiV1 => OPENAI_V1_API_PREFIX,
        }
    }

    pub const fn sdk_family(self) -> &'static str {
        match self {
            Self::App => "app",
            Self::Backend => "backend",
            Self::OpenAiV1 => "ai",
        }
    }

    pub const fn sdk_client(self) -> &'static str {
        match self {
            Self::App => "SdkworkAppClient",
            Self::Backend => "SdkworkBackendClient",
            Self::OpenAiV1 => "SdkworkAiClient",
        }
    }

    pub fn from_path(path: &str) -> Option<Self> {
        if path.starts_with(BACKEND_API_PREFIX) {
            Some(Self::Backend)
        } else if path.starts_with(APP_API_PREFIX) {
            Some(Self::App)
        } else if path.starts_with(OPENAI_V1_API_PREFIX) {
            Some(Self::OpenAiV1)
        } else {
            None
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn api_surface_exposes_java_compatible_prefixes_and_sdk_clients() {
        assert_eq!("/app/v3/api", ApiSurface::App.api_prefix());
        assert_eq!("/backend/v3/api", ApiSurface::Backend.api_prefix());
        assert_eq!("/v1", ApiSurface::OpenAiV1.api_prefix());
        assert_eq!("SdkworkAppClient", ApiSurface::App.sdk_client());
        assert_eq!("SdkworkBackendClient", ApiSurface::Backend.sdk_client());
        assert_eq!("SdkworkAiClient", ApiSurface::OpenAiV1.sdk_client());
    }

    #[test]
    fn api_surface_is_inferred_from_paths() {
        assert_eq!(
            Some(ApiSurface::App),
            ApiSurface::from_path("/app/v3/api/iam/users/current")
        );
        assert_eq!(
            Some(ApiSurface::Backend),
            ApiSurface::from_path("/backend/v3/api/router/models")
        );
        assert_eq!(
            Some(ApiSurface::OpenAiV1),
            ApiSurface::from_path("/v1/chat/completions")
        );
        assert_eq!(None, ApiSurface::from_path("/api/custom"));
    }
}
