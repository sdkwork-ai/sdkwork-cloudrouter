#![allow(dead_code)]

use sdkwork_claw_config::{ProviderPassthroughAuth, ProviderPassthroughHeader};
use sdkwork_clawrouter_router_service::domain::{ProviderAuthProfile, ProviderAuthType};

pub(crate) struct RenderedProviderAccountAuth {
    pub(crate) auth: ProviderPassthroughAuth,
    pub(crate) default_headers: Vec<ProviderPassthroughHeader>,
}

pub(crate) fn render_provider_account_auth(
    profile: &ProviderAuthProfile,
    secret_value: String,
) -> Result<RenderedProviderAccountAuth, String> {
    Ok(RenderedProviderAccountAuth {
        auth: render_passthrough_auth(profile, secret_value)?,
        default_headers: render_default_headers(profile)?,
    })
}

fn render_passthrough_auth(
    profile: &ProviderAuthProfile,
    secret_value: String,
) -> Result<ProviderPassthroughAuth, String> {
    match profile.auth_type {
        ProviderAuthType::Bearer => ProviderPassthroughAuth::bearer(secret_value),
        ProviderAuthType::Header => {
            let name = profile
                .name
                .as_deref()
                .ok_or_else(|| "provider account auth profile header name is missing".to_owned())?;
            ProviderPassthroughAuth::header(name, secret_value)
        }
        ProviderAuthType::Query => {
            let name = profile
                .name
                .as_deref()
                .ok_or_else(|| "provider account auth profile query name is missing".to_owned())?;
            ProviderPassthroughAuth::query(name, secret_value)
        }
    }
}

fn render_default_headers(
    profile: &ProviderAuthProfile,
) -> Result<Vec<ProviderPassthroughHeader>, String> {
    profile
        .default_headers
        .iter()
        .map(|header| ProviderPassthroughHeader::new(&header.name, &header.value))
        .collect()
}
