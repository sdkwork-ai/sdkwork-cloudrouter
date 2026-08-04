pub fn query_pairs(query: Option<&str>) -> Vec<(String, String)> {
    query
        .filter(|value| !value.is_empty())
        .into_iter()
        .flat_map(|value| value.split('&'))
        .filter(|part| !part.is_empty())
        .map(|part| {
            let (key, value) = part.split_once('=').unwrap_or((part, ""));
            (decode_query_component(key), decode_query_component(value))
        })
        .collect()
}

pub fn parse_usize_query_param(field: &str, value: &str) -> Result<usize, String> {
    if value.trim().is_empty() {
        return Err(format!("{field} must be a positive integer"));
    }
    value
        .parse::<usize>()
        .map_err(|_| format!("{field} must be a positive integer"))
}

pub fn parse_i64_query_param(field: &str, value: &str) -> Result<i64, String> {
    if value.trim().is_empty() {
        return Err(format!("{field} must be a positive integer"));
    }
    value
        .parse::<i64>()
        .map_err(|_| format!("{field} must be a positive integer"))
}

fn decode_query_component(value: &str) -> String {
    let replaced = value.replace('+', " ");
    let bytes = replaced.as_bytes();
    let mut output = Vec::with_capacity(bytes.len());
    let mut index = 0;
    while index < bytes.len() {
        if bytes[index] == b'%' && index + 2 < bytes.len() {
            if let Ok(hex) = u8::from_str_radix(&replaced[index + 1..index + 3], 16) {
                output.push(hex);
                index += 3;
                continue;
            }
        }
        output.push(bytes[index]);
        index += 1;
    }
    String::from_utf8_lossy(&output).into_owned()
}
