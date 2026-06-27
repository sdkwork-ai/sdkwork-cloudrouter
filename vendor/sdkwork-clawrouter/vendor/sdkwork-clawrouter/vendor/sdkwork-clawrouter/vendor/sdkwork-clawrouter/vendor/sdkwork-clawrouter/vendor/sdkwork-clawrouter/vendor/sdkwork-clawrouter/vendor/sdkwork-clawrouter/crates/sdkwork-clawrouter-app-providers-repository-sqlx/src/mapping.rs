use sqlx::Row;

use sdkwork_models_catalog_service::domain::IntegrationProviderType;

use crate::error::{RepositoryError, RepositoryResult};
use crate::provider_classification::provider_family_code;
use crate::types::{AppProviderItem, AppProvidersSubject};

pub(crate) fn require_subject(
    subject: Option<AppProvidersSubject>,
) -> RepositoryResult<AppProvidersSubject> {
    subject.ok_or_else(|| {
        RepositoryError::new("trusted request subject is required for app providers")
    })
}

pub(crate) fn row_to_provider<R: Row + RowMapping>(row: &R) -> RepositoryResult<AppProviderItem> {
    let provider_code = row.string_cell("provider_code");
    let default_vendor_code = row.string_cell("default_vendor_code");
    let integration_type = integration_type_code(row)?;
    let channel_required = row.optional_integer_cell("channel_id").is_some();
    let account_required = row.optional_integer_cell("account_id").is_some();
    let proxy_required = row.optional_integer_cell("proxy_id").is_some();
    let provider_status = row.required_integer_cell("provider_status")?;
    let channel_status = row.related_integer_cell("channel_status", channel_required)?;
    let channel_health_status =
        row.related_integer_cell("channel_health_status", channel_required)?;
    let account_status = row.related_integer_cell("account_status", account_required)?;
    let proxy_status = row.related_integer_cell("proxy_status", proxy_required)?;
    let proxy_health_status = row.related_integer_cell("proxy_health_status", proxy_required)?;
    Ok(AppProviderItem {
        id: row.string_cell("id"),
        provider_family: provider_family_code(&provider_code, &default_vendor_code),
        integration_type,
        name: row.string_cell("name"),
        description: row.string_cell("description"),
        url: row.string_cell("url"),
        status: provider_status_label(
            provider_status,
            channel_status,
            channel_health_status,
            account_status,
            proxy_status,
            proxy_health_status,
        )?,
    })
}

pub(crate) trait RowMapping {
    fn string_cell(&self, column: &str) -> String;
    fn optional_integer_cell(&self, column: &str) -> Option<i64>;
    fn required_integer_cell(&self, column: &str) -> RepositoryResult<i64>;
    fn related_integer_cell(&self, column: &str, required: bool) -> RepositoryResult<Option<i64>>;
}

impl RowMapping for sqlx::postgres::PgRow {
    fn string_cell(&self, column: &str) -> String {
        self.try_get::<Option<String>, _>(column)
            .ok()
            .flatten()
            .unwrap_or_default()
    }

    fn optional_integer_cell(&self, column: &str) -> Option<i64> {
        self.try_get::<Option<i64>, _>(column)
            .ok()
            .flatten()
            .or_else(|| {
                self.try_get::<Option<i32>, _>(column)
                    .ok()
                    .flatten()
                    .map(i64::from)
            })
            .or_else(|| self.string_cell(column).parse::<i64>().ok())
    }

    fn required_integer_cell(&self, column: &str) -> RepositoryResult<i64> {
        self.optional_integer_cell(column).ok_or_else(|| {
            RepositoryError::new(format!("missing provider {column} from database row"))
        })
    }

    fn related_integer_cell(&self, column: &str, required: bool) -> RepositoryResult<Option<i64>> {
        let value = self.optional_integer_cell(column);
        if required && value.is_none() {
            return Err(RepositoryError::new(format!(
                "missing provider {column} from database row"
            )));
        }
        Ok(value)
    }
}

impl RowMapping for sqlx::sqlite::SqliteRow {
    fn string_cell(&self, column: &str) -> String {
        self.try_get::<Option<String>, _>(column)
            .ok()
            .flatten()
            .unwrap_or_default()
    }

    fn optional_integer_cell(&self, column: &str) -> Option<i64> {
        self.try_get::<Option<i64>, _>(column)
            .ok()
            .flatten()
            .or_else(|| {
                self.try_get::<Option<i32>, _>(column)
                    .ok()
                    .flatten()
                    .map(i64::from)
            })
            .or_else(|| self.string_cell(column).parse::<i64>().ok())
    }

    fn required_integer_cell(&self, column: &str) -> RepositoryResult<i64> {
        self.optional_integer_cell(column).ok_or_else(|| {
            RepositoryError::new(format!("missing provider {column} from database row"))
        })
    }

    fn related_integer_cell(&self, column: &str, required: bool) -> RepositoryResult<Option<i64>> {
        let value = self.optional_integer_cell(column);
        if required && value.is_none() {
            return Err(RepositoryError::new(format!(
                "missing provider {column} from database row"
            )));
        }
        Ok(value)
    }
}

fn integration_type_code<R: RowMapping>(row: &R) -> RepositoryResult<String> {
    let Some(value) = row.optional_integer_cell("integration_type") else {
        return Ok(IntegrationProviderType::Unknown.code().to_owned());
    };
    let code = i32::try_from(value).map_err(|_| {
        RepositoryError::new(format!(
            "invalid provider integration_type from database row: {value}"
        ))
    })?;
    IntegrationProviderType::try_from_int_code(code)
        .map(|integration_type| integration_type.code().to_owned())
        .ok_or_else(|| {
            RepositoryError::new(format!(
                "invalid provider integration_type from database row: {value}"
            ))
        })
}

fn provider_status_label(
    provider_status: i64,
    channel_status: Option<i64>,
    channel_health_status: Option<i64>,
    account_status: Option<i64>,
    proxy_status: Option<i64>,
    proxy_health_status: Option<i64>,
) -> RepositoryResult<String> {
    validate_status_code("provider_status", provider_status)?;
    validate_optional_status_code("channel_status", channel_status)?;
    validate_optional_health_status("channel_health_status", channel_health_status)?;
    validate_optional_status_code("account_status", account_status)?;
    validate_optional_status_code("proxy_status", proxy_status)?;
    validate_optional_health_status("proxy_health_status", proxy_health_status)?;

    let active = provider_status == 1
        && channel_status == Some(1)
        && channel_health_status == Some(1)
        && account_status.unwrap_or(1) == 1
        && proxy_status.unwrap_or(1) == 1
        && proxy_health_status.unwrap_or(1) == 1;

    Ok(if active { "active" } else { "inactive" }.to_owned())
}

fn validate_optional_status_code(column: &str, value: Option<i64>) -> RepositoryResult<()> {
    if let Some(value) = value {
        validate_status_code(column, value)?;
    }
    Ok(())
}

fn validate_optional_health_status(column: &str, value: Option<i64>) -> RepositoryResult<()> {
    match value {
        Some(1 | 2) | None => Ok(()),
        Some(value) => Err(RepositoryError::new(format!(
            "invalid provider {column} from database row: {value}"
        ))),
    }
}

fn validate_status_code(column: &str, value: i64) -> RepositoryResult<()> {
    match value {
        -1 | 0 | 1 | 2 => Ok(()),
        value => Err(RepositoryError::new(format!(
            "invalid provider {column} from database row: {value}"
        ))),
    }
}
