use std::sync::Arc;

use axum::body::Bytes;
use axum::extract::{Extension, Query, State};
use axum::http::HeaderMap;
use axum::response::{IntoResponse, Response};
use axum::routing::get;
use axum::{Json, Router};
use sdkwork_cloudrouter_http::RequestLocale;
use serde::{Deserialize, Serialize};
use serde_json::{json, Value};

use crate::api::request_id::generate_server_request_id;
use crate::api::response::{bad_request, success_envelope};
use crate::api::text_normalization::parse_json_body;
use crate::api::command_error::{
    command_error_from_request_id as request_id_error, command_error_response,
    system_error_response, ApiCommandError,
};
use crate::application::EntityUuidGenerator;
use crate::ports::{
    unsupported_site_settings_locale_keys, GetSiteSettingsQuery, GetSiteSettingsScopeQuery,
    SiteSettings, SiteSettingsI18n, SiteSettingsStore, SiteSettingsSubject,
    UpdateSiteSettingsCommand,
};
use sdkwork_utils_rust::datetime::current_timestamp_string;

const MAX_SHORT_TEXT_LEN: usize = 255;
const MAX_LONG_TEXT_LEN: usize = 4096;
const MAX_URL_LEN: usize = 2048;
const MAX_COLOR_LEN: usize = 32;
const MAX_CUSTOM_CSS_LEN: usize = 20000;
/// Ceiling on an operator-authored content document (`homepage` copy, `downloads` catalog),
/// measured in serialized UTF-8 bytes.
///
/// The portal owns both shapes, so this is the only guard the service can apply without
/// re-implementing a contract it does not own: it keeps a malformed or hostile payload from
/// parking an unbounded blob in `ops_config_snapshot.config_payload`, which every portal page
/// load then decodes. 256 KiB leaves comfortable room for a long-form homepage plus a download
/// catalog spanning many products, platforms and architectures.
const MAX_CONTENT_DOCUMENT_BYTES: usize = 262_144;
const MAX_TENANT_CODE_LENGTH: usize = 64;
const MAX_ORGANIZATION_CODE_LENGTH: usize = 64;

#[derive(Clone)]
struct AdminSiteSettingsState {
    store: Arc<dyn SiteSettingsStore + Send + Sync>,
    entity_uuid_generator: Arc<dyn EntityUuidGenerator + Send + Sync>,
}

#[derive(Clone)]
struct AppSiteSettingsState {
    store: Option<Arc<dyn SiteSettingsStore + Send + Sync>>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct SiteSettingsUpdateRequest {
    site_name: Option<String>,
    site_name_i18n: Option<SiteSettingsI18n>,
    short_name: Option<String>,
    short_name_i18n: Option<SiteSettingsI18n>,
    description: Option<String>,
    description_i18n: Option<SiteSettingsI18n>,
    logo: Option<Value>,
    icon: Option<Value>,
    favicon: Option<Value>,
    official_account_qr_code: Option<Value>,
    community_group_qr_code: Option<Value>,
    video_channel_qr_code: Option<Value>,
    douyin_qr_code: Option<Value>,
    official_account_qr_code_enabled: Option<bool>,
    community_group_qr_code_enabled: Option<bool>,
    video_channel_qr_code_enabled: Option<bool>,
    douyin_qr_code_enabled: Option<bool>,
    brand_color: Option<String>,
    accent_color: Option<String>,
    footer_copyright: Option<String>,
    footer_copyright_i18n: Option<SiteSettingsI18n>,
    icp_record_number: Option<String>,
    icp_record_url: Option<String>,
    police_record_number: Option<String>,
    police_record_url: Option<String>,
    seo_title: Option<String>,
    seo_title_i18n: Option<SiteSettingsI18n>,
    seo_description: Option<String>,
    seo_description_i18n: Option<SiteSettingsI18n>,
    support_url: Option<String>,
    docs_url: Option<String>,
    privacy_url: Option<String>,
    terms_url: Option<String>,
    custom_css: Option<String>,
    /// Operator-authored homepage document. Absent leaves the stored document untouched; `{}`
    /// clears it back to "nothing authored", which makes the portal fall back to its built-in
    /// copy and to the release catalog checked into the repository.
    homepage: Option<Value>,
    /// Operator-authored download catalog. Same absent / `{}` / reject semantics as `homepage`.
    downloads: Option<Value>,
    footer_brand_enabled: Option<bool>,
    footer_newsletter_enabled: Option<bool>,
    footer_product_links_enabled: Option<bool>,
    footer_resource_links_enabled: Option<bool>,
    footer_company_links_enabled: Option<bool>,
    footer_qr_codes_enabled: Option<bool>,
    footer_social_enabled: Option<bool>,
    footer_legal_enabled: Option<bool>,
    footer_social_github_enabled: Option<bool>,
    footer_social_github_url: Option<String>,
    footer_social_twitter_enabled: Option<bool>,
    footer_social_twitter_url: Option<String>,
    footer_social_linkedin_enabled: Option<bool>,
    footer_social_linkedin_url: Option<String>,
    footer_social_youtube_enabled: Option<bool>,
    footer_social_youtube_url: Option<String>,
    footer_social_weibo_enabled: Option<bool>,
    footer_social_weibo_url: Option<String>,
    footer_social_xiaohongshu_enabled: Option<bool>,
    footer_social_xiaohongshu_url: Option<String>,
    footer_social_bilibili_enabled: Option<bool>,
    footer_social_bilibili_url: Option<String>,
    footer_social_douyin_enabled: Option<bool>,
    footer_social_douyin_url: Option<String>,
    footer_social_zhihu_enabled: Option<bool>,
    footer_social_zhihu_url: Option<String>,
    footer_social_telegram_enabled: Option<bool>,
    footer_social_telegram_url: Option<String>,
    footer_social_discord_enabled: Option<bool>,
    footer_social_discord_url: Option<String>,
    footer_social_email_enabled: Option<bool>,
    footer_social_email_url: Option<String>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "snake_case")]
struct SiteRuntimeSettingsQuery {
    tenant_code: Option<String>,
    organization_code: Option<String>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct SiteSettingsResponse {
    site_name: String,
    site_name_i18n: SiteSettingsI18n,
    short_name: String,
    short_name_i18n: SiteSettingsI18n,
    description: String,
    description_i18n: SiteSettingsI18n,
    logo: Value,
    icon: Value,
    favicon: Value,
    official_account_qr_code: Value,
    community_group_qr_code: Value,
    video_channel_qr_code: Value,
    douyin_qr_code: Value,
    official_account_qr_code_enabled: bool,
    community_group_qr_code_enabled: bool,
    video_channel_qr_code_enabled: bool,
    douyin_qr_code_enabled: bool,
    brand_color: String,
    accent_color: String,
    footer_copyright: String,
    footer_copyright_i18n: SiteSettingsI18n,
    icp_record_number: String,
    icp_record_url: String,
    police_record_number: String,
    police_record_url: String,
    seo_title: String,
    seo_title_i18n: SiteSettingsI18n,
    seo_description: String,
    seo_description_i18n: SiteSettingsI18n,
    support_url: String,
    docs_url: String,
    privacy_url: String,
    terms_url: String,
    custom_css: String,
    /// Operator-authored homepage document; `{}` when nothing has been authored. Passed through
    /// verbatim — the portal package owns the shape and applies its own defaults.
    homepage: Value,
    /// Operator-authored download catalog; `{}` when nothing has been authored.
    downloads: Value,
    footer_brand_enabled: bool,
    footer_newsletter_enabled: bool,
    footer_product_links_enabled: bool,
    footer_resource_links_enabled: bool,
    footer_company_links_enabled: bool,
    footer_qr_codes_enabled: bool,
    footer_social_enabled: bool,
    footer_legal_enabled: bool,
    footer_social_github_enabled: bool,
    footer_social_github_url: String,
    footer_social_twitter_enabled: bool,
    footer_social_twitter_url: String,
    footer_social_linkedin_enabled: bool,
    footer_social_linkedin_url: String,
    footer_social_youtube_enabled: bool,
    footer_social_youtube_url: String,
    footer_social_weibo_enabled: bool,
    footer_social_weibo_url: String,
    footer_social_xiaohongshu_enabled: bool,
    footer_social_xiaohongshu_url: String,
    footer_social_bilibili_enabled: bool,
    footer_social_bilibili_url: String,
    footer_social_douyin_enabled: bool,
    footer_social_douyin_url: String,
    footer_social_zhihu_enabled: bool,
    footer_social_zhihu_url: String,
    footer_social_telegram_enabled: bool,
    footer_social_telegram_url: String,
    footer_social_discord_enabled: bool,
    footer_social_discord_url: String,
    footer_social_email_enabled: bool,
    footer_social_email_url: String,
}

pub fn admin_site_settings_router_with_store(
    store: Arc<dyn SiteSettingsStore + Send + Sync>,
    entity_uuid_generator: Arc<dyn EntityUuidGenerator + Send + Sync>,
) -> Router {
    Router::new()
        .route(
            "/backend/v3/api/system/site/settings",
            get(fetch_site_settings).patch(update_site_settings),
        )
        .with_state(AdminSiteSettingsState {
            store,
            entity_uuid_generator,
        })
}

pub fn app_site_settings_router() -> Router {
    app_site_settings_router_with_optional_store(None)
}

pub fn app_site_settings_router_with_store(
    store: Arc<dyn SiteSettingsStore + Send + Sync>,
) -> Router {
    app_site_settings_router_with_optional_store(Some(store))
}

fn app_site_settings_router_with_optional_store(
    store: Option<Arc<dyn SiteSettingsStore + Send + Sync>>,
) -> Router {
    Router::new()
        .route(
            "/app/v3/api/system/site/runtime",
            get(fetch_site_runtime_settings),
        )
        .with_state(AppSiteSettingsState { store })
}

async fn fetch_site_settings(
    State(state): State<AdminSiteSettingsState>,
    scoped: crate::api::admin_sql_subject::SqlScopedAdminSubject,
    _headers: HeaderMap,
) -> Response {
    let subject = scoped.into();

    match state
        .store
        .get_site_settings(GetSiteSettingsQuery { subject })
        .await
    {
        Ok(settings) => Json(success_envelope(to_response(settings))).into_response(),
        Err(error) => {
            system_error_response("site settings read model is unavailable", error)
        }
    }
}

async fn update_site_settings(
    State(state): State<AdminSiteSettingsState>,
    scoped: crate::api::admin_sql_subject::SqlScopedAdminSubject,
    headers: HeaderMap,
    body: Bytes,
) -> Response {
    let subject = scoped.into();
    let request = match parse_json_body::<SiteSettingsUpdateRequest>(&body, "site settings") {
        Ok(request) => request,
        Err(message) => return bad_request(message),
    };
    let current = match state
        .store
        .get_site_settings(GetSiteSettingsQuery { subject })
        .await
    {
        Ok(settings) => settings,
        Err(error) => {
            return system_error_response("site settings read model is unavailable", error);
        }
    };
    let settings = match merge_update_request(current, request) {
        Ok(settings) => settings,
        Err(message) => return bad_request(message),
    };
    let command = match build_update_command(state.clone(), &headers, subject, settings) {
        Ok(command) => command,
        Err(error) => return command_error_response(error, "site settings command is invalid"),
    };

    match state.store.update_site_settings(command).await {
        Ok(settings) => Json(success_envelope(to_response(settings))).into_response(),
        Err(error) => {
            system_error_response("site settings command store is unavailable", error)
        }
    }
}

async fn fetch_site_runtime_settings(
    State(state): State<AppSiteSettingsState>,
    Query(query): Query<SiteRuntimeSettingsQuery>,
    locale: Option<Extension<RequestLocale>>,
) -> Response {
    // The locale middleware resolves the effective tag from `Accept-Language` and every
    // generated SDK client already sends it, so the published copy follows the reader's
    // language without this endpoint gaining a locale parameter.
    let locale = locale.map(|Extension(locale)| locale.effective);
    let Some(store) = state.store.as_ref() else {
        return Json(success_envelope(to_response(
            SiteSettings::default().localized_for(locale.as_deref()),
        )))
        .into_response();
    };
    let tenant_code = match normalize_optional_field(
        "tenant_code",
        query.tenant_code.as_deref(),
        MAX_TENANT_CODE_LENGTH,
    ) {
        Ok(value) => value,
        Err(message) => return bad_request(message),
    };
    let organization_code = match normalize_optional_field(
        "organization_code",
        query.organization_code.as_deref(),
        MAX_ORGANIZATION_CODE_LENGTH,
    ) {
        Ok(value) => value,
        Err(message) => return bad_request(message),
    };
    match store
        .get_site_settings_for_scope(GetSiteSettingsScopeQuery {
            tenant_code: optional_string(tenant_code),
            organization_code: optional_string(organization_code),
        })
        .await
    {
        Ok(settings) => Json(success_envelope(to_response(
            settings.localized_for(locale.as_deref()),
        )))
        .into_response(),
        Err(error) if error.is_not_found() => Json(success_envelope(to_response(
            SiteSettings::default().localized_for(locale.as_deref()),
        )))
        .into_response(),
        Err(error) => system_error_response("site runtime settings are unavailable", error),
    }
}

fn merge_update_request(
    mut current: SiteSettings,
    request: SiteSettingsUpdateRequest,
) -> Result<SiteSettings, String> {
    if let Some(value) = request.site_name {
        current.site_name = normalize_required_field("siteName", &value, MAX_SHORT_TEXT_LEN)?;
    }
    if let Some(value) = request.site_name_i18n {
        current.site_name_i18n = normalize_i18n_field("siteNameI18n", value, MAX_SHORT_TEXT_LEN)?;
    }
    if let Some(value) = request.short_name {
        current.short_name =
            normalize_optional_field("shortName", Some(&value), MAX_SHORT_TEXT_LEN)?;
    }
    if let Some(value) = request.short_name_i18n {
        current.short_name_i18n = normalize_i18n_field("shortNameI18n", value, MAX_SHORT_TEXT_LEN)?;
    }
    if let Some(value) = request.description {
        current.description =
            normalize_optional_field("description", Some(&value), MAX_LONG_TEXT_LEN)?;
    }
    if let Some(value) = request.description_i18n {
        current.description_i18n =
            normalize_i18n_field("descriptionI18n", value, MAX_LONG_TEXT_LEN)?;
    }
    if let Some(value) = request.logo {
        current.logo = normalize_media_resource("logo", value)?;
    }
    if let Some(value) = request.icon {
        current.icon = normalize_media_resource("icon", value)?;
    }
    if let Some(value) = request.favicon {
        current.favicon = normalize_media_resource("favicon", value)?;
    }
    if let Some(value) = request.official_account_qr_code {
        current.official_account_qr_code =
            normalize_media_resource("officialAccountQrCode", value)?;
    }
    if let Some(value) = request.community_group_qr_code {
        current.community_group_qr_code = normalize_media_resource("communityGroupQrCode", value)?;
    }
    if let Some(value) = request.video_channel_qr_code {
        current.video_channel_qr_code = normalize_media_resource("videoChannelQrCode", value)?;
    }
    if let Some(value) = request.douyin_qr_code {
        current.douyin_qr_code = normalize_media_resource("douyinQrCode", value)?;
    }
    if let Some(value) = request.official_account_qr_code_enabled {
        current.official_account_qr_code_enabled = value;
    }
    if let Some(value) = request.community_group_qr_code_enabled {
        current.community_group_qr_code_enabled = value;
    }
    if let Some(value) = request.video_channel_qr_code_enabled {
        current.video_channel_qr_code_enabled = value;
    }
    if let Some(value) = request.douyin_qr_code_enabled {
        current.douyin_qr_code_enabled = value;
    }
    if let Some(value) = request.brand_color {
        current.brand_color = normalize_color_field("brandColor", &value)?;
    }
    if let Some(value) = request.accent_color {
        current.accent_color = normalize_color_field("accentColor", &value)?;
    }
    if let Some(value) = request.footer_copyright {
        current.footer_copyright =
            normalize_optional_field("footerCopyright", Some(&value), MAX_LONG_TEXT_LEN)?;
    }
    if let Some(value) = request.footer_copyright_i18n {
        current.footer_copyright_i18n =
            normalize_i18n_field("footerCopyrightI18n", value, MAX_LONG_TEXT_LEN)?;
    }
    if let Some(value) = request.icp_record_number {
        current.icp_record_number =
            normalize_optional_field("icpRecordNumber", Some(&value), MAX_SHORT_TEXT_LEN)?;
    }
    if let Some(value) = request.icp_record_url {
        current.icp_record_url = normalize_url_field("icpRecordUrl", &value)?;
    }
    if let Some(value) = request.police_record_number {
        current.police_record_number =
            normalize_optional_field("policeRecordNumber", Some(&value), MAX_SHORT_TEXT_LEN)?;
    }
    if let Some(value) = request.police_record_url {
        current.police_record_url = normalize_url_field("policeRecordUrl", &value)?;
    }
    if let Some(value) = request.seo_title {
        current.seo_title = normalize_optional_field("seoTitle", Some(&value), MAX_SHORT_TEXT_LEN)?;
    }
    if let Some(value) = request.seo_title_i18n {
        current.seo_title_i18n = normalize_i18n_field("seoTitleI18n", value, MAX_SHORT_TEXT_LEN)?;
    }
    if let Some(value) = request.seo_description {
        current.seo_description =
            normalize_optional_field("seoDescription", Some(&value), MAX_LONG_TEXT_LEN)?;
    }
    if let Some(value) = request.seo_description_i18n {
        current.seo_description_i18n =
            normalize_i18n_field("seoDescriptionI18n", value, MAX_LONG_TEXT_LEN)?;
    }
    if let Some(value) = request.support_url {
        current.support_url = normalize_url_field("supportUrl", &value)?;
    }
    if let Some(value) = request.docs_url {
        current.docs_url = normalize_url_field("docsUrl", &value)?;
    }
    if let Some(value) = request.privacy_url {
        current.privacy_url = normalize_url_field("privacyUrl", &value)?;
    }
    if let Some(value) = request.terms_url {
        current.terms_url = normalize_url_field("termsUrl", &value)?;
    }
    if let Some(value) = request.custom_css {
        current.custom_css =
            normalize_optional_field("customCss", Some(&value), MAX_CUSTOM_CSS_LEN)?;
    }
    if let Some(value) = request.homepage {
        current.homepage = normalize_content_document("homepage", value)?;
    }
    if let Some(value) = request.downloads {
        current.downloads = normalize_content_document("downloads", value)?;
    }
    if let Some(value) = request.footer_brand_enabled {
        current.footer_brand_enabled = value;
    }
    if let Some(value) = request.footer_newsletter_enabled {
        current.footer_newsletter_enabled = value;
    }
    if let Some(value) = request.footer_product_links_enabled {
        current.footer_product_links_enabled = value;
    }
    if let Some(value) = request.footer_resource_links_enabled {
        current.footer_resource_links_enabled = value;
    }
    if let Some(value) = request.footer_company_links_enabled {
        current.footer_company_links_enabled = value;
    }
    if let Some(value) = request.footer_qr_codes_enabled {
        current.footer_qr_codes_enabled = value;
    }
    if let Some(value) = request.footer_social_enabled {
        current.footer_social_enabled = value;
    }
    if let Some(value) = request.footer_legal_enabled {
        current.footer_legal_enabled = value;
    }
    if let Some(value) = request.footer_social_github_enabled {
        current.footer_social_github_enabled = value;
    }
    if let Some(value) = request.footer_social_github_url {
        current.footer_social_github_url =
            normalize_social_link_field("footerSocialGithubUrl", &value)?;
    }
    if let Some(value) = request.footer_social_twitter_enabled {
        current.footer_social_twitter_enabled = value;
    }
    if let Some(value) = request.footer_social_twitter_url {
        current.footer_social_twitter_url =
            normalize_social_link_field("footerSocialTwitterUrl", &value)?;
    }
    if let Some(value) = request.footer_social_linkedin_enabled {
        current.footer_social_linkedin_enabled = value;
    }
    if let Some(value) = request.footer_social_linkedin_url {
        current.footer_social_linkedin_url =
            normalize_social_link_field("footerSocialLinkedinUrl", &value)?;
    }
    if let Some(value) = request.footer_social_youtube_enabled {
        current.footer_social_youtube_enabled = value;
    }
    if let Some(value) = request.footer_social_youtube_url {
        current.footer_social_youtube_url =
            normalize_social_link_field("footerSocialYoutubeUrl", &value)?;
    }
    if let Some(value) = request.footer_social_weibo_enabled {
        current.footer_social_weibo_enabled = value;
    }
    if let Some(value) = request.footer_social_weibo_url {
        current.footer_social_weibo_url =
            normalize_social_link_field("footerSocialWeiboUrl", &value)?;
    }
    if let Some(value) = request.footer_social_xiaohongshu_enabled {
        current.footer_social_xiaohongshu_enabled = value;
    }
    if let Some(value) = request.footer_social_xiaohongshu_url {
        current.footer_social_xiaohongshu_url =
            normalize_social_link_field("footerSocialXiaohongshuUrl", &value)?;
    }
    if let Some(value) = request.footer_social_bilibili_enabled {
        current.footer_social_bilibili_enabled = value;
    }
    if let Some(value) = request.footer_social_bilibili_url {
        current.footer_social_bilibili_url =
            normalize_social_link_field("footerSocialBilibiliUrl", &value)?;
    }
    if let Some(value) = request.footer_social_douyin_enabled {
        current.footer_social_douyin_enabled = value;
    }
    if let Some(value) = request.footer_social_douyin_url {
        current.footer_social_douyin_url =
            normalize_social_link_field("footerSocialDouyinUrl", &value)?;
    }
    if let Some(value) = request.footer_social_zhihu_enabled {
        current.footer_social_zhihu_enabled = value;
    }
    if let Some(value) = request.footer_social_zhihu_url {
        current.footer_social_zhihu_url =
            normalize_social_link_field("footerSocialZhihuUrl", &value)?;
    }
    if let Some(value) = request.footer_social_telegram_enabled {
        current.footer_social_telegram_enabled = value;
    }
    if let Some(value) = request.footer_social_telegram_url {
        current.footer_social_telegram_url =
            normalize_social_link_field("footerSocialTelegramUrl", &value)?;
    }
    if let Some(value) = request.footer_social_discord_enabled {
        current.footer_social_discord_enabled = value;
    }
    if let Some(value) = request.footer_social_discord_url {
        current.footer_social_discord_url =
            normalize_social_link_field("footerSocialDiscordUrl", &value)?;
    }
    if let Some(value) = request.footer_social_email_enabled {
        current.footer_social_email_enabled = value;
    }
    if let Some(value) = request.footer_social_email_url {
        current.footer_social_email_url =
            normalize_social_link_field("footerSocialEmailUrl", &value)?;
    }
    Ok(current.normalized())
}

fn normalize_required_field(
    field_name: &str,
    value: &str,
    max_len: usize,
) -> Result<String, String> {
    let value = normalize_optional_field(field_name, Some(value), max_len)?;
    if value.is_empty() {
        return Err(format!("{field_name} must not be empty"));
    }
    Ok(value)
}

fn normalize_optional_field(
    field_name: &str,
    value: Option<&str>,
    max_len: usize,
) -> Result<String, String> {
    let value = value.unwrap_or_default().trim();
    if value.chars().count() > max_len {
        return Err(format!(
            "{field_name} length must not exceed {max_len} characters"
        ));
    }
    if value.chars().any(|ch| ch.is_ascii_control()) {
        return Err(format!("{field_name} must not contain control characters"));
    }
    Ok(value.to_owned())
}

/// Validates an operator-supplied locale override map for one copy field.
///
/// The map replaces the stored one wholesale. That is deliberate: a merge could never
/// *remove* an override, so an operator who cleared a translation would watch it come back
/// on the next save. Blank values are dropped (an override that resolves to nothing is the
/// same as no override), and unsupported locale keys are rejected rather than dropped so a
/// typo such as `zh-HK` or `en` fails loudly instead of saving copy that can never resolve.
fn normalize_i18n_field(
    field_name: &str,
    value: SiteSettingsI18n,
    max_len: usize,
) -> Result<SiteSettingsI18n, String> {
    let unsupported = unsupported_site_settings_locale_keys(&value);
    if !unsupported.is_empty() {
        return Err(format!(
            "{field_name} keys must be supported locale tags; unsupported: {}",
            unsupported.join(", ")
        ));
    }

    let mut normalized = SiteSettingsI18n::new();
    for (tag, text) in value {
        let text = normalize_optional_field(&format!("{field_name}.{tag}"), Some(&text), max_len)?;
        if text.is_empty() {
            continue;
        }
        normalized.insert(tag, text);
    }
    Ok(normalized)
}

/// Social/contact links address people, not pages: besides the http(s) and root-relative
/// forms accepted by `normalize_url_field`, they may be `mailto:` or `tel:`. The email
/// platform's own default is a `mailto:` URL, so rejecting those schemes here would make
/// the shipped default unsaveable.
fn normalize_social_link_field(field_name: &str, value: &str) -> Result<String, String> {
    let value = normalize_optional_field(field_name, Some(value), MAX_URL_LEN)?;
    if value.is_empty() || value.starts_with('/') {
        return Ok(value);
    }
    const ALLOWED_SCHEMES: [&str; 4] = ["https://", "http://", "mailto:", "tel:"];
    if !ALLOWED_SCHEMES
        .iter()
        .any(|scheme| value.starts_with(scheme))
    {
        return Err(format!(
            "{field_name} must be empty, root-relative, http(s), mailto, or tel link"
        ));
    }
    if value.chars().any(char::is_whitespace) {
        return Err(format!("{field_name} must not contain whitespace"));
    }
    Ok(value)
}

fn normalize_url_field(field_name: &str, value: &str) -> Result<String, String> {
    let value = normalize_optional_field(field_name, Some(value), MAX_URL_LEN)?;
    if value.is_empty() || value.starts_with('/') {
        return Ok(value);
    }
    if !(value.starts_with("https://") || value.starts_with("http://")) {
        return Err(format!(
            "{field_name} must be empty, root-relative, http, or https URL"
        ));
    }
    if value.chars().any(char::is_whitespace) {
        return Err(format!("{field_name} must not contain whitespace"));
    }
    Ok(value)
}

fn normalize_media_resource(field_name: &str, value: Value) -> Result<Value, String> {
    let mut object = value
        .as_object()
        .cloned()
        .ok_or_else(|| format!("{field_name} must be a MediaResource object"))?;
    let kind = normalize_required_media_text(field_name, object.get("kind"), "kind", 64)?;
    let source = normalize_required_media_text(field_name, object.get("source"), "source", 64)?;
    object.insert("kind".to_owned(), Value::String(kind));
    object.insert("source".to_owned(), Value::String(source));

    for key in ["id", "publicUrl", "url", "uri", "objectKey", "objectBlobId"] {
        if let Some(value) = object.get_mut(key) {
            let Some(text) = value.as_str() else {
                return Err(format!("{field_name}.{key} must be a string"));
            };
            let normalized =
                normalize_optional_field(&format!("{field_name}.{key}"), Some(text), MAX_URL_LEN)?;
            *value = Value::String(normalized);
        }
    }

    Ok(Value::Object(object))
}

/// Validates an operator-authored content document (`homepage` copy, `downloads` catalog).
///
/// The service does not own either shape — the portal package does, and it gains fields
/// without a service release — so the only contract enforced here is the one that protects the
/// shared config row: the value must be a JSON object and must serialize within
/// [`MAX_CONTENT_DOCUMENT_BYTES`]. Field-level validation is deliberately **not** duplicated:
/// a second, drifting copy of the portal's contract is exactly how an admin ends up able to
/// save something the homepage then cannot render.
///
/// `null` is accepted as an explicit clear and normalised to `{}`, so the stored payload keeps
/// a single spelling of "nothing authored". The portal treats both identically, but one
/// spelling stays greppable in the JSONB column.
fn normalize_content_document(field_name: &str, value: Value) -> Result<Value, String> {
    let value = match value {
        Value::Object(object) => Value::Object(object),
        Value::Null => json!({}),
        _ => {
            return Err(format!(
                "{field_name} must be a JSON object (send {{}} to clear it)"
            ))
        }
    };
    let serialized_len = serde_json::to_string(&value)
        .map_err(|error| format!("{field_name} could not be serialized: {error}"))?
        .len();
    if serialized_len > MAX_CONTENT_DOCUMENT_BYTES {
        return Err(format!(
            "{field_name} must serialize within {MAX_CONTENT_DOCUMENT_BYTES} bytes, got {serialized_len}"
        ));
    }
    Ok(value)
}

fn normalize_required_media_text(
    field_name: &str,
    value: Option<&Value>,
    key: &str,
    max_len: usize,
) -> Result<String, String> {
    let Some(value) = value else {
        return Err(format!("{field_name} must include MediaResource {key}"));
    };
    let Some(value) = value.as_str() else {
        return Err(format!("{field_name}.{key} must be a string"));
    };
    let value = normalize_required_field(&format!("{field_name}.{key}"), value, max_len)?;
    Ok(value)
}

fn normalize_color_field(field_name: &str, value: &str) -> Result<String, String> {
    let value = normalize_optional_field(field_name, Some(value), MAX_COLOR_LEN)?;
    if is_hex_color(&value) {
        Ok(value)
    } else {
        Err(format!("{field_name} must be a 3 or 6 digit hex color"))
    }
}

fn is_hex_color(value: &str) -> bool {
    let bytes = value.as_bytes();
    if !(bytes.len() == 4 || bytes.len() == 7) || bytes.first() != Some(&b'#') {
        return false;
    }
    bytes[1..].iter().all(u8::is_ascii_hexdigit)
}

fn build_update_command(
    state: AdminSiteSettingsState,
    _headers: &HeaderMap,
    subject: SiteSettingsSubject,
    settings: SiteSettings,
) -> Result<UpdateSiteSettingsCommand, ApiCommandError> {
    Ok(UpdateSiteSettingsCommand {
        subject,
        audit_log_uuid: generate_entity_uuid(&state)?,
        config_snapshot_uuid: generate_entity_uuid(&state)?,
        settings,
        request_id: generate_server_request_id().map_err(request_id_error)?,
        requested_at: current_timestamp_string(),
    })
}

fn generate_entity_uuid(
    state: &AdminSiteSettingsState,
) -> Result<String, ApiCommandError> {
    state
        .entity_uuid_generator
        .generate_entity_uuid()
        .map_err(ApiCommandError::System)
}

fn optional_string(value: String) -> Option<String> {
    if value.is_empty() {
        None
    } else {
        Some(value)
    }
}

fn to_response(settings: SiteSettings) -> SiteSettingsResponse {
    SiteSettingsResponse {
        site_name: settings.site_name,
        site_name_i18n: settings.site_name_i18n,
        short_name: settings.short_name,
        short_name_i18n: settings.short_name_i18n,
        description: settings.description,
        description_i18n: settings.description_i18n,
        logo: settings.logo,
        icon: settings.icon,
        favicon: settings.favicon,
        official_account_qr_code: settings.official_account_qr_code,
        community_group_qr_code: settings.community_group_qr_code,
        video_channel_qr_code: settings.video_channel_qr_code,
        douyin_qr_code: settings.douyin_qr_code,
        official_account_qr_code_enabled: settings.official_account_qr_code_enabled,
        community_group_qr_code_enabled: settings.community_group_qr_code_enabled,
        video_channel_qr_code_enabled: settings.video_channel_qr_code_enabled,
        douyin_qr_code_enabled: settings.douyin_qr_code_enabled,
        brand_color: settings.brand_color,
        accent_color: settings.accent_color,
        footer_copyright: settings.footer_copyright,
        footer_copyright_i18n: settings.footer_copyright_i18n,
        icp_record_number: settings.icp_record_number,
        icp_record_url: settings.icp_record_url,
        police_record_number: settings.police_record_number,
        police_record_url: settings.police_record_url,
        seo_title: settings.seo_title,
        seo_title_i18n: settings.seo_title_i18n,
        seo_description: settings.seo_description,
        seo_description_i18n: settings.seo_description_i18n,
        support_url: settings.support_url,
        docs_url: settings.docs_url,
        privacy_url: settings.privacy_url,
        terms_url: settings.terms_url,
        custom_css: settings.custom_css,
        homepage: settings.homepage,
        downloads: settings.downloads,
        footer_brand_enabled: settings.footer_brand_enabled,
        footer_newsletter_enabled: settings.footer_newsletter_enabled,
        footer_product_links_enabled: settings.footer_product_links_enabled,
        footer_resource_links_enabled: settings.footer_resource_links_enabled,
        footer_company_links_enabled: settings.footer_company_links_enabled,
        footer_qr_codes_enabled: settings.footer_qr_codes_enabled,
        footer_social_enabled: settings.footer_social_enabled,
        footer_legal_enabled: settings.footer_legal_enabled,
        footer_social_github_enabled: settings.footer_social_github_enabled,
        footer_social_github_url: settings.footer_social_github_url,
        footer_social_twitter_enabled: settings.footer_social_twitter_enabled,
        footer_social_twitter_url: settings.footer_social_twitter_url,
        footer_social_linkedin_enabled: settings.footer_social_linkedin_enabled,
        footer_social_linkedin_url: settings.footer_social_linkedin_url,
        footer_social_youtube_enabled: settings.footer_social_youtube_enabled,
        footer_social_youtube_url: settings.footer_social_youtube_url,
        footer_social_weibo_enabled: settings.footer_social_weibo_enabled,
        footer_social_weibo_url: settings.footer_social_weibo_url,
        footer_social_xiaohongshu_enabled: settings.footer_social_xiaohongshu_enabled,
        footer_social_xiaohongshu_url: settings.footer_social_xiaohongshu_url,
        footer_social_bilibili_enabled: settings.footer_social_bilibili_enabled,
        footer_social_bilibili_url: settings.footer_social_bilibili_url,
        footer_social_douyin_enabled: settings.footer_social_douyin_enabled,
        footer_social_douyin_url: settings.footer_social_douyin_url,
        footer_social_zhihu_enabled: settings.footer_social_zhihu_enabled,
        footer_social_zhihu_url: settings.footer_social_zhihu_url,
        footer_social_telegram_enabled: settings.footer_social_telegram_enabled,
        footer_social_telegram_url: settings.footer_social_telegram_url,
        footer_social_discord_enabled: settings.footer_social_discord_enabled,
        footer_social_discord_url: settings.footer_social_discord_url,
        footer_social_email_enabled: settings.footer_social_email_enabled,
        footer_social_email_url: settings.footer_social_email_url,
    }
}

#[cfg(test)]
mod tests {
    use std::collections::BTreeMap;

    use serde_json::json;

    use super::{merge_update_request, to_response, SiteSettingsUpdateRequest, MAX_SHORT_TEXT_LEN};
    use crate::ports::{SiteSettings, SiteSettingsI18n};

    fn overrides(entries: &[(&str, &str)]) -> SiteSettingsI18n {
        entries
            .iter()
            .map(|(tag, text)| ((*tag).to_owned(), (*text).to_owned()))
            .collect::<BTreeMap<String, String>>()
    }

    fn request(value: serde_json::Value) -> SiteSettingsUpdateRequest {
        serde_json::from_value(value).expect("test request must deserialize")
    }

    /// Replacing the map wholesale is what makes "clear one language" possible. A merge could only
    /// ever add entries, so a translation the operator deleted would reappear on the next save.
    #[test]
    fn merge_update_request_replaces_the_override_map_wholesale() {
        let current = SiteSettings {
            site_name_i18n: overrides(&[("zh-CN", "云路由"), ("ja-JP", "クラウドルーター")]),
            ..SiteSettings::default()
        };

        let merged = merge_update_request(
            current,
            request(json!({ "siteNameI18n": { "ja-JP": "クラウドルーター" } })),
        )
        .expect("a supported locale map must merge");

        assert_eq!(
            Some("クラウドルーター"),
            merged.site_name_i18n.get("ja-JP").map(String::as_str)
        );
        assert!(
            !merged.site_name_i18n.contains_key("zh-CN"),
            "an omitted locale must be treated as cleared, not preserved"
        );
    }

    /// A partial save that does not mention the maps leaves every translation alone, so editing the
    /// site name from a form that predates translations cannot wipe them.
    #[test]
    fn merge_update_request_leaves_the_override_maps_untouched_when_absent() {
        let current = SiteSettings {
            site_name_i18n: overrides(&[("zh-CN", "云路由")]),
            ..SiteSettings::default()
        };

        let merged =
            merge_update_request(current, request(json!({ "siteName": "Tenant Gateway" })))
                .expect("a base-field-only update must merge");

        assert_eq!("Tenant Gateway", merged.site_name);
        assert_eq!(
            Some("云路由"),
            merged.site_name_i18n.get("zh-CN").map(String::as_str)
        );
    }

    /// Rejected, not dropped. Silently discarding `zh-HK` would make the save appear to succeed
    /// while the Traditional Chinese copy the operator typed never renders anywhere.
    #[test]
    fn merge_update_request_rejects_unsupported_locale_keys() {
        for bad_tag in ["zh-HK", "zh", "en", "th-TH"] {
            // Built rather than written as a literal: `json!` reads a bare identifier as a key
            // *named* `bad_tag`, which would make this test pass without testing anything.
            let mut map = serde_json::Map::new();
            map.insert(
                bad_tag.to_owned(),
                serde_json::Value::String("copy".to_owned()),
            );
            let mut body = serde_json::Map::new();
            body.insert("siteNameI18n".to_owned(), serde_json::Value::Object(map));

            let error = merge_update_request(
                SiteSettings::default(),
                request(serde_json::Value::Object(body)),
            )
            .expect_err(&format!("{bad_tag} must be rejected"));

            assert!(
                error.contains("siteNameI18n") && error.contains(bad_tag),
                "error must name the field and the offending tag, got: {error}"
            );
        }
    }

    /// `en-US` is addressable and `en` is not, so the canonical tag has to be checked per key
    /// rather than by language prefix.
    #[test]
    fn merge_update_request_accepts_every_canonical_locale_tag() {
        let merged = merge_update_request(
            SiteSettings::default(),
            request(json!({
                "siteNameI18n": {
                    "en-US": "Cloud Router",
                    "zh-CN": "云路由",
                    "ja-JP": "クラウドルーター",
                    "de-DE": "Cloud Router",
                    "fr-FR": "Cloud Router",
                    "ru-RU": "Cloud Router",
                    "ko-KR": "클라우드 라우터",
                }
            })),
        )
        .expect("every canonical locale must be accepted");

        assert_eq!(7, merged.site_name_i18n.len());
    }

    /// An override that resolves to nothing is the same state as no override, and only the latter
    /// keeps the base copy published — so blanks are dropped rather than stored.
    #[test]
    fn merge_update_request_drops_blank_translations() {
        let merged = merge_update_request(
            SiteSettings::default(),
            request(json!({ "siteNameI18n": { "zh-CN": "   ", "ja-JP": "クラウドルーター" } })),
        )
        .expect("blanks are dropped, not rejected");

        assert_eq!(1, merged.site_name_i18n.len());
        assert!(!merged.site_name_i18n.contains_key("zh-CN"));
    }

    /// Each override is length-checked like the base field it overrides, and the error names the
    /// locale so the operator knows which input to shorten.
    #[test]
    fn merge_update_request_length_checks_each_locale_independently() {
        let too_long = "a".repeat(MAX_SHORT_TEXT_LEN + 1);
        let error = merge_update_request(
            SiteSettings::default(),
            request(json!({ "siteNameI18n": { "zh-CN": too_long } })),
        )
        .expect_err("an over-long translation must be rejected");

        assert!(
            error.contains("siteNameI18n.zh-CN"),
            "error must name the locale, got: {error}"
        );
    }

    /// The admin form edits the maps, so the response has to hand every one of them back. A field
    /// that is written but not echoed leaves the input empty and the next save clears it.
    #[test]
    fn to_response_carries_every_override_map_back() {
        let settings = SiteSettings {
            site_name_i18n: overrides(&[("zh-CN", "云路由")]),
            short_name_i18n: overrides(&[("zh-CN", "云路由")]),
            description_i18n: overrides(&[("ja-JP", "統合 AI ゲートウェイ")]),
            seo_title_i18n: overrides(&[("zh-CN", "云路由")]),
            seo_description_i18n: overrides(&[("de-DE", "Einheitliches KI-Gateway")]),
            footer_copyright_i18n: overrides(&[("ko-KR", "클라우드 라우터")]),
            ..SiteSettings::default()
        };

        let payload = serde_json::to_value(to_response(settings)).expect("response must serialize");

        for (field, tag, expected) in [
            ("siteNameI18n", "zh-CN", "云路由"),
            ("shortNameI18n", "zh-CN", "云路由"),
            ("descriptionI18n", "ja-JP", "統合 AI ゲートウェイ"),
            ("seoTitleI18n", "zh-CN", "云路由"),
            ("seoDescriptionI18n", "de-DE", "Einheitliches KI-Gateway"),
            ("footerCopyrightI18n", "ko-KR", "클라우드 라우터"),
        ] {
            assert_eq!(
                Some(expected),
                payload
                    .get(field)
                    .and_then(|map| map.get(tag))
                    .and_then(serde_json::Value::as_str),
                "{field}.{tag} must be echoed back to the admin form"
            );
        }
    }
}
