pub(crate) fn stable_command_request_hash(scope: &str, parts: &[&str]) -> String {
    let mut normalized = vec![scope];
    normalized.extend(parts);
    normalized
        .iter()
        .map(|part| {
            part.chars()
                .map(|character| {
                    if character.is_ascii_alphanumeric() || matches!(character, '-' | '_' | '.') {
                        character
                    } else {
                        '-'
                    }
                })
                .collect::<String>()
        })
        .collect::<Vec<_>>()
        .join("-")
}

pub(crate) fn stable_canonical_json_request_hash(scope: &str, value: &serde_json::Value) -> String {
    stable_command_request_hash(scope, &[&canonical_json_string(value)])
}

fn canonical_json_string(value: &serde_json::Value) -> String {
    match value {
        serde_json::Value::Null => "null".to_string(),
        serde_json::Value::Bool(value) => value.to_string(),
        serde_json::Value::Number(value) => value.to_string(),
        serde_json::Value::String(value) => {
            serde_json::to_string(value).unwrap_or_else(|_| "\"\"".to_owned())
        }
        serde_json::Value::Array(values) => {
            let items = values
                .iter()
                .map(canonical_json_string)
                .collect::<Vec<_>>()
                .join(",");
            format!("[{items}]")
        }
        serde_json::Value::Object(values) => {
            let mut keys = values.keys().collect::<Vec<_>>();
            keys.sort_unstable();
            let items = keys
                .into_iter()
                .filter(|key| !values[*key].is_null())
                .map(|key| {
                    format!(
                        "{}:{}",
                        serde_json::to_string(key).unwrap_or_else(|_| "\"\"".to_owned()),
                        canonical_json_string(&values[key])
                    )
                })
                .collect::<Vec<_>>()
                .join(",");
            format!("{{{items}}}")
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn stable_command_request_hash_is_deterministic() {
        let first = stable_command_request_hash("scope", &["100001", "request-1"]);
        let second = stable_command_request_hash("scope", &["100001", "request-1"]);
        assert_eq!(first, second);
        assert!(!first.is_empty());
    }

    #[test]
    fn stable_canonical_json_request_hash_matches_struct_payloads() {
        use serde::{Deserialize, Serialize};

        let body_json = r#"{"methodKey":"wechat_pay","displayName":"WeChat Pay","providerCode":"wechat_pay","status":"active"}"#;
        let value: serde_json::Value = serde_json::from_str(body_json).expect("json");
        let from_value = stable_canonical_json_request_hash("payment-method-upsert", &value);

        #[derive(Serialize, Deserialize)]
        #[serde(rename_all = "camelCase")]
        struct UpsertPaymentMethodBody {
            method_key: Option<String>,
            display_name: Option<String>,
            provider_code: Option<String>,
            status: Option<String>,
            sort_order: Option<i64>,
        }

        let body: UpsertPaymentMethodBody = serde_json::from_str(body_json).expect("body");
        let from_struct = stable_canonical_json_request_hash(
            "payment-method-upsert",
            &serde_json::to_value(body).expect("value"),
        );

        assert_eq!(from_value, from_struct);
    }
}
