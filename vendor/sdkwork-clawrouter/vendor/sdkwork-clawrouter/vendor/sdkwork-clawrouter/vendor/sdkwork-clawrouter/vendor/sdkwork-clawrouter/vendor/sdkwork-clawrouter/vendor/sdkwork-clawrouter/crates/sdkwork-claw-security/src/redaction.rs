pub const REDACTED: &str = "[REDACTED]";

pub fn redact_secret(value: impl AsRef<str>) -> String {
    let value = value.as_ref();
    if value.len() <= 8 {
        return REDACTED.to_string();
    }

    let prefix: String = value.chars().take(4).collect();
    let suffix: String = value
        .chars()
        .rev()
        .take(4)
        .collect::<Vec<_>>()
        .into_iter()
        .rev()
        .collect();
    format!("{prefix}...{REDACTED}...{suffix}")
}
