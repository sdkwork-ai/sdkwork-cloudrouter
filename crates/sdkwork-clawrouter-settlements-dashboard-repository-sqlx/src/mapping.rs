use sdkwork_models_catalog_service::domain::DecimalValue;
use sqlx::Row;

use crate::error::{RepositoryError, RepositoryResult};
use crate::modality::{
    MODALITY_AUDIO, MODALITY_IMAGE, MODALITY_MUSIC, MODALITY_TEXT, MODALITY_VIDEO,
};
use crate::types::{
    SettlementBill, SettlementBillBreakdown, SettlementBillBreakdownItem, SettlementChartPoint,
    SettlementsDashboardQuery, SettlementsDashboardSubject,
};

pub(crate) fn require_subject(
    subject: Option<SettlementsDashboardSubject>,
) -> RepositoryResult<SettlementsDashboardSubject> {
    subject.ok_or_else(|| {
        RepositoryError::new("trusted request subject is required for settlements dashboard")
    })
}

pub(crate) fn year_filter(query: &SettlementsDashboardQuery) -> Option<String> {
    query.year.map(|year| year.to_string())
}

pub(crate) fn row_to_bill<R: RowMapping>(row: &R) -> RepositoryResult<SettlementBill> {
    Ok(SettlementBill {
        id: row.string_cell("statement_no"),
        period: row.string_cell("period"),
        start_date: row.string_cell("period_start"),
        end_date: row.string_cell("period_end"),
        total_tokens: row.string_cell("total_tokens"),
        total_cost: row.decimal_string_cell("total_cost", 6, "settlement bill total cost")?,
        status: statement_status_label(
            row.required_statement_status_cell("payment_status", "payment")?,
            row.required_statement_status_cell("statement_status", "statement")?,
        )?,
        breakdown: SettlementBillBreakdown::default(),
    })
}

pub(crate) fn merge_item_into_breakdown<R: RowMapping>(
    breakdown: &mut SettlementBillBreakdown,
    row: &R,
) -> RepositoryResult<()> {
    let modality = row.required_modality_cell("modality", "settlement item")?;
    let target = breakdown_item_mut(breakdown, modality)?;
    let item_cost = row.decimal_string_cell("cost_amount", 6, "settlement item cost")?;
    target.cost = decimal_add_strings(&target.cost, &item_cost, 6)?;
    if target.usage.is_empty() {
        target.usage = usage_label(row, modality);
    }
    extend_unique_models(
        &mut target.models,
        model_list(&row.string_cell("model_list"), &row.string_cell("model"))?,
    );
    Ok(())
}

pub(crate) fn chart_point_from_row<R: RowMapping>(
    row: &R,
) -> RepositoryResult<SettlementChartPoint> {
    Ok(SettlementChartPoint {
        day: row.string_cell("day"),
        text: row.decimal_string_cell("text_cost", 6, "settlement chart text cost")?,
        image: row.decimal_string_cell("image_cost", 6, "settlement chart image cost")?,
        video: row.decimal_string_cell("video_cost", 6, "settlement chart video cost")?,
        audio: row.decimal_string_cell("audio_cost", 6, "settlement chart audio cost")?,
        music: row.decimal_string_cell("music_cost", 6, "settlement chart music cost")?,
    })
}

pub(crate) trait RowMapping {
    fn string_cell(&self, column: &str) -> String;
    fn optional_integer_cell(&self, column: &str) -> Option<i64>;
    fn integer_cell(&self, column: &str) -> i64 {
        self.optional_integer_cell(column).unwrap_or(0)
    }
    fn required_statement_status_cell(&self, column: &str, source: &str) -> RepositoryResult<i64> {
        self.optional_integer_cell(column)
            .ok_or_else(|| missing_statement_status_error(source))
    }
    fn required_modality_cell(&self, column: &str, source: &str) -> RepositoryResult<i64> {
        self.optional_integer_cell(column)
            .ok_or_else(|| missing_modality_error(source))
    }
    fn decimal_string_cell(
        &self,
        column: &str,
        digits: u32,
        field_name: &str,
    ) -> RepositoryResult<String> {
        decimal_value_string(&self.string_cell(column), digits, field_name)
    }
    fn whole_decimal_string_cell(&self, column: &str) -> String {
        whole_decimal_string(&self.string_cell(column))
    }
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
            .or_else(|| integer_string_cell(&self.string_cell(column)))
    }
}

fn breakdown_item_mut(
    breakdown: &mut SettlementBillBreakdown,
    modality: i64,
) -> RepositoryResult<&mut SettlementBillBreakdownItem> {
    match modality {
        MODALITY_TEXT => Ok(&mut breakdown.text),
        MODALITY_IMAGE => Ok(&mut breakdown.image),
        MODALITY_VIDEO => Ok(&mut breakdown.video),
        MODALITY_AUDIO => Ok(&mut breakdown.audio),
        MODALITY_MUSIC => Ok(&mut breakdown.music),
        value => Err(RepositoryError::new(format!(
            "unsupported settlement item modality: {value}"
        ))),
    }
}

fn usage_label<R: RowMapping>(row: &R, modality: i64) -> String {
    let usage_text = row.string_cell("usage_text");
    if !usage_text.is_empty() {
        return usage_text;
    }

    match modality {
        MODALITY_TEXT => format!("{} tokens", row.integer_cell("token_count")),
        MODALITY_IMAGE => format!("{} items", row.integer_cell("asset_count")),
        MODALITY_VIDEO | MODALITY_AUDIO | MODALITY_MUSIC => {
            format!("{}s", row.whole_decimal_string_cell("duration_seconds"))
        }
        _ => format!("{} requests", row.integer_cell("request_count")),
    }
}

pub(crate) fn model_list(raw: &str, fallback: &str) -> RepositoryResult<Vec<String>> {
    let mut models = if raw.trim().is_empty() {
        Vec::new()
    } else {
        serde_json::from_str::<Vec<String>>(raw).map_err(|error| {
            RepositoryError::new(format!(
                "invalid settlement model list json from database row: {error}"
            ))
        })?
    };
    models.retain(|model| !model.trim().is_empty());
    if models.is_empty() && fallback != "-" && !fallback.is_empty() {
        models.push(fallback.to_owned());
    }
    Ok(models)
}

fn extend_unique_models(target: &mut Vec<String>, values: Vec<String>) {
    for value in values {
        if !target.iter().any(|item| item == &value) {
            target.push(value);
        }
    }
}

fn statement_status_label(payment_status: i64, statement_status: i64) -> RepositoryResult<String> {
    ensure_statement_status("payment", payment_status)?;
    ensure_statement_status("statement", statement_status)?;
    Ok(match (payment_status, statement_status) {
        (2, _) | (_, 2) => "已结清",
        (3, _) | (_, 3) => "已逾期",
        _ => "待结算",
    }
    .to_owned())
}

fn ensure_statement_status(source: &str, status: i64) -> RepositoryResult<()> {
    match status {
        0..=5 => Ok(()),
        value => Err(RepositoryError::new(format!(
            "unsupported settlement bill status {source}={value}"
        ))),
    }
}

fn missing_statement_status_error(source: &str) -> RepositoryError {
    match source {
        "payment" => RepositoryError::new("missing settlement bill status payment"),
        "statement" => RepositoryError::new("missing settlement bill status statement"),
        value => RepositoryError::new(format!("missing settlement bill status {value}")),
    }
}

fn missing_modality_error(source: &str) -> RepositoryError {
    match source {
        "settlement item" => RepositoryError::new("missing settlement item modality"),
        value => RepositoryError::new(format!("missing {value} modality")),
    }
}

fn integer_string_cell(value: &str) -> Option<i64> {
    let value = value.trim();
    if let Ok(parsed) = value.parse::<i64>() {
        return Some(parsed);
    }
    let (whole, fraction) = value.split_once('.')?;
    if fraction.chars().all(|ch| ch == '0') {
        return whole.parse::<i64>().ok();
    }
    None
}

pub(crate) fn decimal_value_string(
    value: &str,
    digits: u32,
    field_name: &str,
) -> RepositoryResult<String> {
    DecimalValue::parse(value)
        .map(|amount| amount.to_fixed_string(digits))
        .map_err(|_| RepositoryError::new(format!("invalid {field_name}: {value}")))
}

pub(crate) fn decimal_add_strings(
    left: &str,
    right: &str,
    digits: u32,
) -> RepositoryResult<String> {
    let left = DecimalValue::parse(left)
        .map_err(|_| RepositoryError::new(format!("invalid settlement decimal addend: {left}")))?;
    let right = DecimalValue::parse(right)
        .map_err(|_| RepositoryError::new(format!("invalid settlement decimal addend: {right}")))?;
    left.checked_add(right)
        .map(|sum| sum.to_fixed_string(digits))
        .map_err(|err| RepositoryError::new(err.to_string()))
}

fn whole_decimal_string(value: &str) -> String {
    let value = value.trim();
    if value.is_empty() {
        return "0".to_owned();
    }
    let unsigned = value.trim_start_matches('-');
    let whole = unsigned.split('.').next().unwrap_or("0");
    let whole = if whole.is_empty() { "0" } else { whole };
    if value.starts_with('-') && whole != "0" {
        format!("-{whole}")
    } else {
        whole.to_owned()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn decimal_value_string_rejects_invalid_database_amount() {
        assert_eq!(
            "12.300000",
            decimal_value_string("12.3", 6, "settlement amount").unwrap()
        );

        let unsupported = decimal_value_string("not-money", 6, "settlement amount")
            .expect_err("invalid settlement money must fail");
        assert!(
            unsupported
                .to_string()
                .contains("invalid settlement amount: not-money"),
            "{unsupported}"
        );
    }

    #[test]
    fn decimal_add_strings_rejects_invalid_database_amount() {
        let unsupported = decimal_add_strings("1.00", "not-money", 6)
            .expect_err("invalid settlement item cost must fail");
        assert!(
            unsupported
                .to_string()
                .contains("invalid settlement decimal addend: not-money"),
            "{unsupported}"
        );
    }

    #[test]
    fn model_list_rejects_invalid_database_json() {
        assert_eq!(
            vec!["gpt-4o".to_owned()],
            model_list(r#"["gpt-4o"]"#, "fallback").expect("valid model json")
        );

        let unsupported =
            model_list("not-json", "fallback").expect_err("invalid model json must fail");
        assert!(
            unsupported
                .to_string()
                .contains("invalid settlement model list json from database row"),
            "{unsupported}"
        );
    }

    #[test]
    fn breakdown_item_mut_rejects_unknown_modality_instead_of_falling_back_to_text() {
        let mut breakdown = SettlementBillBreakdown::default();
        let unsupported = breakdown_item_mut(&mut breakdown, 99)
            .expect_err("unknown settlement modality must fail closed");
        assert!(
            unsupported
                .to_string()
                .contains("unsupported settlement item modality: 99"),
            "{unsupported}"
        );
    }
}
