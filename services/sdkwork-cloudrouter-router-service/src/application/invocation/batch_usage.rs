use std::collections::BTreeMap;

use serde_json::Value;

use crate::domain::{DomainError, DomainResult};

/// The upstream resource a batch row belongs to. A batch result file mixes
/// endpoints, and each endpoint bills through a different meter, so usage is
/// aggregated per `(model, kind)` instead of per model alone.
#[derive(Debug, Clone, Copy, PartialEq, Eq, PartialOrd, Ord)]
pub enum BatchUsageKind {
    ChatCompletion,
    Responses,
    Embedding,
    AnthropicMessage,
}

impl BatchUsageKind {
    pub fn as_str(self) -> &'static str {
        match self {
            Self::ChatCompletion => "chat.completion",
            Self::Responses => "responses",
            Self::Embedding => "embedding",
            Self::AnthropicMessage => "anthropic.message",
        }
    }

    pub fn from_wire(value: &str) -> Option<Self> {
        match value {
            "chat.completion" => Some(Self::ChatCompletion),
            "responses" => Some(Self::Responses),
            "embedding" => Some(Self::Embedding),
            "anthropic.message" => Some(Self::AnthropicMessage),
            _ => None,
        }
    }
}

/// Token usage of one `(model, kind)` inside a completed batch.
#[derive(Debug, Clone, Default, PartialEq, Eq)]
pub struct BatchUsageTotals {
    pub request_count: i64,
    pub input_tokens: i64,
    pub output_tokens: i64,
}

/// One aggregated row: which model and endpoint produced the usage.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct BatchUsageBucket {
    pub model: String,
    pub kind: BatchUsageKind,
    pub totals: BatchUsageTotals,
}

/// Aggregates an OpenAI batch result file (JSONL) per `(model, endpoint)`.
///
/// Each line is one request:
/// `{"custom_id": "...", "response": {"status_code": 200, "body": {"model": "...",
/// "object": "chat.completion", "usage": {"prompt_tokens": N, "completion_tokens": M}}},
/// "error": null}`. Failed requests (`error` present, or a non-2xx
/// `response.status_code`) carry no usage and are counted only in the per-row
/// request total so the caller can reconcile against the batch's
/// `request_counts`.
///
/// A malformed line, or a successful row whose endpoint cannot be recognised,
/// fails the whole aggregation: silently summing a truncated file or guessing a
/// meter would bill the wrong amount for every request it did contain.
pub fn sum_openai_batch_usage(jsonl: &[u8]) -> DomainResult<Vec<BatchUsageBucket>> {
    let text = std::str::from_utf8(jsonl)
        .map_err(|error| DomainError::new(format!("batch result file is not UTF-8: {error}")))?;
    let mut totals: BTreeMap<(String, BatchUsageKind), BatchUsageTotals> = BTreeMap::new();
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
        let response = value.get("response");
        let status_code = response
            .and_then(|response| response.get("status_code"))
            .and_then(Value::as_i64)
            .unwrap_or(0);
        let body = response.and_then(|response| response.get("body"));
        let model = model_of(body);
        let failed = value.get("error").is_some_and(|error| !error.is_null());
        if failed || !(200..300).contains(&status_code) {
            // Count the failed request under its model; a failed row may carry
            // no endpoint, so it lands in the chat bucket regardless.
            let entry = totals
                .entry((model, BatchUsageKind::ChatCompletion))
                .or_default();
            entry.request_count += 1;
            continue;
        }
        let kind = kind_of(body).ok_or_else(|| {
            DomainError::new(format!(
                "batch result line {} has an unrecognised response object: {}",
                index + 1,
                body.and_then(|body| body.get("object"))
                    .and_then(Value::as_str)
                    .unwrap_or("<missing>")
            ))
        })?;
        let entry = totals.entry((model, kind)).or_default();
        entry.request_count += 1;
        if let Some(usage) = body.and_then(|body| body.get("usage")) {
            entry.input_tokens += token_field(usage, &["prompt_tokens", "input_tokens"]);
            entry.output_tokens += token_field(usage, &["completion_tokens", "output_tokens"]);
        }
    }
    Ok(totals
        .into_iter()
        .map(|((model, kind), totals)| BatchUsageBucket {
            model,
            kind,
            totals,
        })
        .collect())
}

/// Aggregates an Anthropic message-batch result file (JSONL).
///
/// Each line is `{"custom_id": "...", "result": {"type": "succeeded",
/// "message": {"model": "...", "usage": {"input_tokens": N, "output_tokens": M}}}}`.
/// Rows whose `result.type` is not `succeeded` (errored/expired/canceled) are
/// counted but never billed.
pub fn sum_anthropic_batch_usage(jsonl: &[u8]) -> DomainResult<Vec<BatchUsageBucket>> {
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
        let result = value.get("result");
        let succeeded = result
            .and_then(|result| result.get("type"))
            .and_then(Value::as_str)
            == Some("succeeded");
        let message = result.and_then(|result| result.get("message"));
        let model = model_of(message);
        let entry = totals.entry(model).or_default();
        entry.request_count += 1;
        if !succeeded {
            continue;
        }
        if let Some(usage) = message.and_then(|message| message.get("usage")) {
            entry.input_tokens += token_field(usage, &["input_tokens", "prompt_tokens"]);
            entry.output_tokens += token_field(usage, &["output_tokens", "completion_tokens"]);
        }
    }
    Ok(totals
        .into_iter()
        .map(|(model, totals)| BatchUsageBucket {
            model,
            kind: BatchUsageKind::AnthropicMessage,
            totals,
        })
        .collect())
}

fn model_of(body: Option<&Value>) -> String {
    body.and_then(|body| body.get("model"))
        .and_then(Value::as_str)
        .map(str::trim)
        .filter(|model| !model.is_empty())
        .unwrap_or("unknown")
        .to_owned()
}

fn kind_of(body: Option<&Value>) -> Option<BatchUsageKind> {
    let body = body?;
    match body.get("object").and_then(Value::as_str) {
        Some("chat.completion") => Some(BatchUsageKind::ChatCompletion),
        Some("response") => Some(BatchUsageKind::Responses),
        Some("list") => Some(BatchUsageKind::Embedding),
        _ => {
            let usage = body.get("usage")?;
            if usage.get("completion_tokens").is_some() {
                Some(BatchUsageKind::ChatCompletion)
            } else if usage.get("prompt_tokens").is_some() || usage.get("input_tokens").is_some() {
                Some(BatchUsageKind::Embedding)
            } else {
                None
            }
        }
    }
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

    fn bucket<'a>(
        buckets: &'a [BatchUsageBucket],
        model: &str,
        kind: BatchUsageKind,
    ) -> &'a BatchUsageTotals {
        &buckets
            .iter()
            .find(|bucket| bucket.model == model && bucket.kind == kind)
            .unwrap_or_else(|| panic!("missing bucket {model}/{kind:?}"))
            .totals
    }

    #[test]
    fn sums_successful_lines_per_model_and_endpoint_and_skips_failures() {
        let jsonl = br#"
{"custom_id":"a","response":{"status_code":200,"body":{"model":"gpt-4o","object":"chat.completion","usage":{"prompt_tokens":10,"completion_tokens":5}}},"error":null}
{"custom_id":"b","response":{"status_code":200,"body":{"model":"gpt-4o","object":"chat.completion","usage":{"prompt_tokens":20,"completion_tokens":7}}},"error":null}
{"custom_id":"c","response":{"status_code":200,"body":{"model":"gpt-4o","object":"response","usage":{"input_tokens":3,"output_tokens":4}}},"error":null}
{"custom_id":"d","response":{"status_code":200,"body":{"model":"text-embedding-3-small","object":"list","usage":{"prompt_tokens":9}}},"error":null}
{"custom_id":"e","response":{"status_code":500,"body":null},"error":{"message":"boom"}}
"#;
        let buckets = sum_openai_batch_usage(jsonl).expect("valid jsonl");
        assert_eq!(
            &BatchUsageTotals {
                request_count: 2,
                input_tokens: 30,
                output_tokens: 12
            },
            bucket(&buckets, "gpt-4o", BatchUsageKind::ChatCompletion)
        );
        assert_eq!(
            &BatchUsageTotals {
                request_count: 1,
                input_tokens: 3,
                output_tokens: 4
            },
            bucket(&buckets, "gpt-4o", BatchUsageKind::Responses)
        );
        assert_eq!(
            &BatchUsageTotals {
                request_count: 1,
                input_tokens: 9,
                output_tokens: 0
            },
            bucket(
                &buckets,
                "text-embedding-3-small",
                BatchUsageKind::Embedding
            )
        );
        assert_eq!(
            1,
            bucket(&buckets, "unknown", BatchUsageKind::ChatCompletion).request_count,
            "failed line still counts against its (unknown) model"
        );
    }

    #[test]
    fn a_malformed_or_unrecognised_line_fails_closed_instead_of_undercounting() {
        let truncated =
            b"{\"custom_id\":\"a\",\"response\":{\"status_code\":200,\"body\":{}}}\n{truncated";
        assert!(sum_openai_batch_usage(truncated).is_err());

        let unknown = br#"{"custom_id":"a","response":{"status_code":200,"body":{"model":"m","usage":{}}},"error":null}"#;
        let error = sum_openai_batch_usage(unknown).expect_err("unknown endpoint");
        assert!(
            error.to_string().contains("unrecognised response object"),
            "{error}"
        );
    }

    #[test]
    fn anthropic_results_bill_only_succeeded_messages() {
        let jsonl = br#"
{"custom_id":"a","result":{"type":"succeeded","message":{"model":"claude-3-5-sonnet","usage":{"input_tokens":11,"output_tokens":22}}}}
{"custom_id":"b","result":{"type":"errored","error":{"type":"invalid_request_error"}}}
"#;
        let buckets = sum_anthropic_batch_usage(jsonl).expect("valid jsonl");
        assert_eq!(
            &BatchUsageTotals {
                request_count: 1,
                input_tokens: 11,
                output_tokens: 22
            },
            bucket(
                &buckets,
                "claude-3-5-sonnet",
                BatchUsageKind::AnthropicMessage
            )
        );
        assert_eq!(
            1,
            bucket(&buckets, "unknown", BatchUsageKind::AnthropicMessage).request_count
        );
    }
}
