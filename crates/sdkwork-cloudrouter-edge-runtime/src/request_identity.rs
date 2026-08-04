use std::sync::atomic::{AtomicU64, Ordering};
use std::time::{SystemTime, UNIX_EPOCH};

static FALLBACK_COUNTER: AtomicU64 = AtomicU64::new(1);

pub(crate) fn generate_server_request_id() -> String {
    let mut bytes = [0_u8; 16];
    if getrandom::fill(&mut bytes).is_err() || bytes.iter().all(|byte| *byte == 0) {
        return fallback_server_request_id();
    }
    mark_uuid_v4(&mut bytes);
    format_uuid(&bytes)
}

fn fallback_server_request_id() -> String {
    let now = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|duration| duration.as_nanos())
        .unwrap_or_default();
    let counter = u128::from(FALLBACK_COUNTER.fetch_add(1, Ordering::Relaxed));
    let process_id = u128::from(std::process::id());
    let mut bytes = (now ^ (counter << 64) ^ (process_id << 32)).to_be_bytes();
    mark_uuid_v4(&mut bytes);
    format_uuid(&bytes)
}

fn mark_uuid_v4(bytes: &mut [u8; 16]) {
    bytes[6] = (bytes[6] & 0x0f) | 0x40;
    bytes[8] = (bytes[8] & 0x3f) | 0x80;
}

fn format_uuid(bytes: &[u8; 16]) -> String {
    let hex = b"0123456789abcdef";
    let mut output = String::with_capacity(36);
    for (index, byte) in bytes.iter().enumerate() {
        if matches!(index, 4 | 6 | 8 | 10) {
            output.push('-');
        }
        output.push(hex[(byte >> 4) as usize] as char);
        output.push(hex[(byte & 0x0f) as usize] as char);
    }
    output
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn generate_server_request_id_returns_uuid_v4_shape() {
        let request_id = generate_server_request_id();
        assert_eq!(36, request_id.len());
        assert_eq!(Some('-'), request_id.chars().nth(8));
        assert_eq!(Some('-'), request_id.chars().nth(13));
        assert_eq!(Some('-'), request_id.chars().nth(18));
        assert_eq!(Some('-'), request_id.chars().nth(23));
        assert_eq!(Some('4'), request_id.chars().nth(14));
        let variant = request_id
            .chars()
            .nth(19)
            .expect("server request id must include UUID variant");
        assert!(matches!(variant, '8' | '9' | 'a' | 'b'));
    }

    #[test]
    fn generate_server_request_id_is_unique_across_calls() {
        let first = generate_server_request_id();
        let second = generate_server_request_id();
        assert_ne!(first, second);
    }
}
