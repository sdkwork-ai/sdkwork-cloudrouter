//! Vendor result gates for per-request billed web tools.
//!
//! DeepSeek's standalone Search/Fetch APIs (`POST /v1/tools/search`,
//! `POST /v1/tools/fetch`) are billed **per successful request**, and DeepSeek
//! defines "successful" as *having produced a result*:
//!
//! - Search bills only when the response carries a non-empty `results` array —
//!   a normal search that matched nothing returns `200` with `[]` and is free.
//! - Fetch bills only when it returns an extractable page body; a page it could
//!   not read answers `404`, and a body-less `200` is not a billable fetch.
//!
//! The gateway sits between the customer and that vendor, so "bill the customer
//! only where the vendor billed us" is a correctness requirement, not a pricing
//! nicety: charging for an empty result would take money for a call the upstream
//! treated as free. [`BillingResultGate`] carries that precondition on the
//! billing record, and this module is the single authority that maps a published
//! api code onto it and decides whether a provider response satisfies it.
//!
//! Keep this list narrow: a gate only belongs here when the vendor's own billing
//! documentation makes the charge conditional on the response payload.

use serde_json::Value;

use super::BillingResultGate;

/// `api.deepseek.web_search` — `POST /v1/tools/search`.
pub const DEEPSEEK_WEB_SEARCH_API_CODE: &str = "deepseek.web_search";
/// `api.deepseek.web_fetch` — `POST /v1/tools/fetch`.
pub const DEEPSEEK_WEB_FETCH_API_CODE: &str = "deepseek.web_fetch";

/// Reason code recorded when a 2xx web-tool response carried no billable result.
pub const WAIVED_EMPTY_SEARCH_RESULTS: &str = "search_returned_no_results";
/// Reason code recorded when a 2xx fetch response carried no extractable body.
pub const WAIVED_EMPTY_FETCH_CONTENT: &str = "fetch_returned_no_content";

/// The provider-result precondition for an api code.
///
/// Every code that does not name a vendor result-gated tool keeps
/// [`BillingResultGate::Any`], i.e. the historical "2xx is billable" rule.
pub fn result_gate_for_api_code(api_code: &str) -> BillingResultGate {
    match api_code.trim() {
        DEEPSEEK_WEB_SEARCH_API_CODE => BillingResultGate::NonEmptyResults,
        DEEPSEEK_WEB_FETCH_API_CODE => BillingResultGate::NonEmptyContent,
        _ => BillingResultGate::Any,
    }
}

/// Stable reason code for a waived charge, for logs and telemetry.
pub fn waived_reason(gate: BillingResultGate) -> Option<&'static str> {
    match gate {
        BillingResultGate::Any => None,
        BillingResultGate::NonEmptyResults => Some(WAIVED_EMPTY_SEARCH_RESULTS),
        BillingResultGate::NonEmptyContent => Some(WAIVED_EMPTY_FETCH_CONTENT),
    }
}

/// Reports whether a provider response body satisfies the gate.
///
/// The checks mirror the vendor's own success definition field by field:
/// `results` must be a non-empty array, `content` must be a non-empty (not
/// whitespace-only) string. A body that does not carry the expected shape is
/// *not* billable — for these tools the payload is the billable artifact, so a
/// missing one cannot be presumed to be a paid call.
pub fn result_gate_satisfied(gate: BillingResultGate, body: &Value) -> bool {
    match gate {
        BillingResultGate::Any => true,
        BillingResultGate::NonEmptyResults => body
            .get("results")
            .and_then(Value::as_array)
            .is_some_and(|results| !results.is_empty()),
        BillingResultGate::NonEmptyContent => body
            .get("content")
            .and_then(Value::as_str)
            .is_some_and(|content| !content.trim().is_empty()),
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::json;

    #[test]
    fn only_the_two_web_tools_carry_a_gate() {
        assert_eq!(
            BillingResultGate::NonEmptyResults,
            result_gate_for_api_code("deepseek.web_search")
        );
        assert_eq!(
            BillingResultGate::NonEmptyContent,
            result_gate_for_api_code("deepseek.web_fetch")
        );
        // Whitespace around a published code must not silently disable the gate.
        assert_eq!(
            BillingResultGate::NonEmptyContent,
            result_gate_for_api_code(" deepseek.web_fetch ")
        );
        for code in [
            "deepseek.chat_completions",
            "openai.moderations",
            "openai.containers",
            "deepseek.web_search_v2",
            "",
        ] {
            assert_eq!(
                BillingResultGate::Any,
                result_gate_for_api_code(code),
                "{code} must keep the historical 2xx-is-billable rule"
            );
        }
    }

    #[test]
    fn search_gate_requires_a_non_empty_results_array() {
        let gate = BillingResultGate::NonEmptyResults;
        assert!(result_gate_satisfied(
            gate,
            &json!({"results": [{"title": "hit"}]})
        ));
        assert!(!result_gate_satisfied(gate, &json!({"results": []})));
        // Missing / mistyped payloads are not evidence of a billable call.
        assert!(!result_gate_satisfied(gate, &json!({})));
        assert!(!result_gate_satisfied(gate, &json!({"results": null})));
        assert!(!result_gate_satisfied(gate, &json!({"results": "hit"})));
    }

    #[test]
    fn fetch_gate_requires_a_non_empty_markdown_body() {
        let gate = BillingResultGate::NonEmptyContent;
        assert!(result_gate_satisfied(
            gate,
            &json!({"title": "Example", "content": "# Example"})
        ));
        assert!(!result_gate_satisfied(
            gate,
            &json!({"title": "x", "content": ""})
        ));
        assert!(!result_gate_satisfied(
            gate,
            &json!({"title": "x", "content": "  \n\t "})
        ));
        assert!(!result_gate_satisfied(gate, &json!({"title": "x"})));
    }

    #[test]
    fn ungated_billing_accepts_any_body() {
        assert!(result_gate_satisfied(
            BillingResultGate::Any,
            &json!({"anything": true})
        ));
        assert_eq!(None, waived_reason(BillingResultGate::Any));
        assert_eq!(
            Some(WAIVED_EMPTY_SEARCH_RESULTS),
            waived_reason(BillingResultGate::NonEmptyResults)
        );
        assert_eq!(
            Some(WAIVED_EMPTY_FETCH_CONTENT),
            waived_reason(BillingResultGate::NonEmptyContent)
        );
    }
}
