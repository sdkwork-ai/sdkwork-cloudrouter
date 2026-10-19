use std::collections::BTreeMap;

use serde_json::Value;

use crate::domain::{DomainError, DomainResult};

/// Token usage of one model inside a completed batch.
#[derive(Debug, Clone, Default, PartialEq, Eq)]
pub struct BatchUsageTotals {
    pub request_count: i64,
    pub input_tokens: i64,
    pub output_tokens: i64,
}

/// Aggregates an OpenAI batch result file (JSONL) by model.
///
/// Each line is one request:
/// `{"custom_id": "...", "response": {"status_code": 200, "body": {"model": "...",
/// "usage": {"prompt_tokens": N, "completion_tokens": M}}}, "error": null}`.
/// Failed requests (`error` present, or a non-2xx `response.status_code`) carry
/// no usage and are counted only in the per-model request total so the caller
/// can reconcile against the batch's `request_counts`.
///
/// A malformed line fails the whole aggregation: silently summing a truncated
/// file would undercharge every request it did contain.
pub fn sum_openai_batch_usage(jsonl: &[u8]) -> DomainResult<BTreeMap<String, BatchUsageTotals>> {
    let text = std::str::from_utf8(jsonl)
        .map_err(|error| DomainError::new(format!("batch result file is not UTF-8: {error}")))?;
    let mut totals: BTreeMap<String, BatchUsageTotals> = BTreeMap::new();
    for (index, line) in text.lines().enumerate() {
        let line = line.trim();
        if line.is_empty() {
            continue;
        }
        let value: Value = serde_json::from_str(line).map_err(|error| {
            DomainError::new(format!(
                "batch result line {} is not valid JSON: {error}",
                index + 1
            ))
        })?;
        let failed = value.get("error").is_some_and(|error| !error.is_null());
        let response = value.get("response");
        let status_code = response
            .and_then(|response| response.get("status_code"))
            .and_then(Value::as_i64)
            .unwrap_or(0);
        let body = response.and_then(|response| response.get("body"));
        let model = body
            .and_then(|body| body.get("model"))
            .and_then(Value::as_str)
            .map(str::trim)
            .filter(|model| !model.is_empty())
            .unwrap_or("unknown")
            .to_owned();
        let entry = totals.entry(model).or_default();
        entry.request_count += 1;
        if failed || !(200..300).contains(&status_code) {
            continue;
        }
        if let Some(usage) = body.and_then(|body| body.get("usage")) {
            entry.input_tokens += token_field(usage, &["prompt_tokens", "input_tokens"]);
            entry.output_tokens += token_field(usage, &["completion_tokens", "output_tokens"]);
        }
    }
    Ok(totals)
}

fn token_field(usage: &Value, names: &[&str]) -> i64 {
    names
        .iter()
        .find_map(|name| usage.get(*name).and_then(Value::as_i64))
        .unwrap_or(0)
        .max(0)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn sums_successful_lines_per_model_and_skips_failures() {
        let jsonl = br#"
{"custom_id":"a","response":{"status_code":200,"body":{"model":"gpt-4o","usage":{"prompt_tokens":10,"completion_tokens":5}}},"error":null}
{"custom_id":"b","response":{"status_code":200,"body":{"model":"gpt-4o","usage":{"prompt_tokens":20,"completion_tokens":7}}},"error":null}
{"custom_id":"c","response":{"status_code":200,"body":{"model":"gpt-4o-mini","usage":{"input_tokens":3,"output_tokens":4}}},"error":null}
{"custom_id":"d","response":{"status_code":500,"body":null},"error":{"message":"boom"}}
"#;
        let totals = sum_openai_batch_usage(jsonl).expect("valid jsonl");
        assert_eq!(
            BatchUsageTotals {
                request_count: 2,
                input_tokens: 30,
                output_tokens: 12
            },
            totals["gpt-4o"]
        );
        assert_eq!(
            BatchUsageTotals {
                request_count: 1,
                input_tokens: 3,
                output_tokens: 4
            },
            totals["gpt-4o-mini"]
        );
        assert_eq!(
            1, totals["unknown"].request_count,
            "failed line still counts"
        );
        assert_eq!(0, totals["unknown"].input_tokens);
    }

    #[test]
    fn a_malformed_line_fails_closed_instead_of_undercounting() {
        let jsonl = b"{\"custom_id\":\"a\",\"response\":{\"status_code\":200,\"body\":{\"usage\":{\"prompt_tokens\":1}}}}\n{truncated";
        assert!(sum_openai_batch_usage(jsonl).is_err());
    }
}
