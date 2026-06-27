use hmac::{Hmac, Mac};
use sdkwork_utils_rust::is_blank;
use sha2::Sha256;

use crate::domain::{DomainError, DomainResult};

type HmacSha256 = Hmac<Sha256>;

const PBKDF2_SHA256_PREFIX: &str = "pbkdf2-sha256";
const HASH_VERSION: &str = "1";
const DEFAULT_ITERATIONS: u32 = 210_000;
const DERIVED_KEY_LEN: usize = 32;
const MIN_ITERATIONS: u32 = 1_000;
const MAX_ITERATIONS: u32 = 1_000_000;

pub trait PasswordHasher {
    fn hash_password(&self, password: &str, salt_hint: &str) -> DomainResult<String>;

    fn verify_password(&self, password: &str, encoded_hash: &str) -> DomainResult<bool>;
}

#[derive(Debug, Default, Clone)]
pub struct Pbkdf2Sha256PasswordHasher;

impl Pbkdf2Sha256PasswordHasher {
    pub fn hash_password_with_salt(
        password: &str,
        salt: &[u8],
        iterations: u32,
    ) -> DomainResult<String> {
        if password.is_empty() {
            return Err(DomainError::new("password must not be empty"));
        }
        if salt.len() < 16 {
            return Err(DomainError::new("password salt must be at least 16 bytes"));
        }
        validate_iterations(iterations)?;
        let derived_key =
            pbkdf2_hmac_sha256(password.as_bytes(), salt, iterations, DERIVED_KEY_LEN)?;
        Ok(format!(
            "{PBKDF2_SHA256_PREFIX}$v={HASH_VERSION}$i={iterations}$s={}$h={}",
            hex::encode(salt),
            hex::encode(derived_key)
        ))
    }

    pub fn default_iterations() -> u32 {
        DEFAULT_ITERATIONS
    }
}

impl PasswordHasher for Pbkdf2Sha256PasswordHasher {
    fn hash_password(&self, password: &str, salt_hint: &str) -> DomainResult<String> {
        let mut salt = Vec::with_capacity(32);
        salt.extend_from_slice(b"sdkwork-clawrouter:");
        salt.extend_from_slice(salt_hint.as_bytes());
        if salt.len() < 16 {
            return Err(DomainError::new("password salt hint is too short"));
        }
        Self::hash_password_with_salt(password, &salt, DEFAULT_ITERATIONS)
    }

    fn verify_password(&self, password: &str, encoded_hash: &str) -> DomainResult<bool> {
        if password.is_empty() || is_blank(Some(encoded_hash)) {
            return Ok(false);
        }
        let parsed = match ParsedPbkdf2Sha256Hash::parse(encoded_hash) {
            Ok(parsed) => parsed,
            Err(_) => return Ok(false),
        };
        let derived_key = pbkdf2_hmac_sha256(
            password.as_bytes(),
            &parsed.salt,
            parsed.iterations,
            parsed.hash.len(),
        )?;
        Ok(constant_time_eq(&derived_key, &parsed.hash))
    }
}

#[derive(Debug, Clone, PartialEq, Eq)]
struct ParsedPbkdf2Sha256Hash {
    iterations: u32,
    salt: Vec<u8>,
    hash: Vec<u8>,
}

impl ParsedPbkdf2Sha256Hash {
    fn parse(value: &str) -> DomainResult<Self> {
        let mut parts = value.split('$');
        let Some(prefix) = parts.next() else {
            return Err(DomainError::new("password hash is invalid"));
        };
        if prefix != PBKDF2_SHA256_PREFIX {
            return Err(DomainError::new("password hash algorithm is unsupported"));
        }

        let mut version: Option<&str> = None;
        let mut iterations: Option<u32> = None;
        let mut salt: Option<Vec<u8>> = None;
        let mut hash: Option<Vec<u8>> = None;

        for part in parts {
            let Some((key, raw_value)) = part.split_once('=') else {
                return Err(DomainError::new("password hash field is invalid"));
            };
            match key {
                "v" => version = Some(raw_value),
                "i" => {
                    let parsed_iterations = raw_value.parse::<u32>().map_err(|_| {
                        DomainError::new("password hash iteration count is invalid")
                    })?;
                    validate_iterations(parsed_iterations)?;
                    iterations = Some(parsed_iterations);
                }
                "s" => {
                    let decoded = hex::decode(raw_value)
                        .map_err(|_| DomainError::new("password hash salt is invalid"))?;
                    if decoded.len() < 16 {
                        return Err(DomainError::new("password hash salt is too short"));
                    }
                    salt = Some(decoded);
                }
                "h" => {
                    let decoded = hex::decode(raw_value)
                        .map_err(|_| DomainError::new("password hash value is invalid"))?;
                    if decoded.len() != DERIVED_KEY_LEN {
                        return Err(DomainError::new("password hash length is invalid"));
                    }
                    hash = Some(decoded);
                }
                _ => return Err(DomainError::new("password hash field is unsupported")),
            }
        }

        if version != Some(HASH_VERSION) {
            return Err(DomainError::new("password hash version is unsupported"));
        }

        Ok(Self {
            iterations: iterations
                .ok_or_else(|| DomainError::new("password hash iteration count is missing"))?,
            salt: salt.ok_or_else(|| DomainError::new("password hash salt is missing"))?,
            hash: hash.ok_or_else(|| DomainError::new("password hash value is missing"))?,
        })
    }
}

fn validate_iterations(iterations: u32) -> DomainResult<()> {
    if !(MIN_ITERATIONS..=MAX_ITERATIONS).contains(&iterations) {
        return Err(DomainError::new(
            "password hash iteration count is out of range",
        ));
    }
    Ok(())
}

fn pbkdf2_hmac_sha256(
    password: &[u8],
    salt: &[u8],
    iterations: u32,
    output_len: usize,
) -> DomainResult<Vec<u8>> {
    if output_len == 0 {
        return Err(DomainError::new("password hash output length is invalid"));
    }
    validate_iterations(iterations)?;

    let hash_len = 32_usize;
    let blocks = (output_len + hash_len - 1) / hash_len;
    let mut derived_key = Vec::with_capacity(blocks * hash_len);
    let mac_template = hmac_for_password(password)?;
    for block_index in 1..=blocks {
        let mut mac = mac_template.clone();
        mac.update(salt);
        mac.update(&(block_index as u32).to_be_bytes());
        let mut block = mac.finalize().into_bytes();
        let mut accumulator = block;

        for _ in 1..iterations {
            let mut mac = mac_template.clone();
            mac.update(block.as_slice());
            block = mac.finalize().into_bytes();
            for (left, right) in accumulator.iter_mut().zip(block.iter()) {
                *left ^= *right;
            }
        }

        derived_key.extend_from_slice(accumulator.as_slice());
    }
    derived_key.truncate(output_len);
    Ok(derived_key)
}

fn hmac_for_password(password: &[u8]) -> DomainResult<HmacSha256> {
    HmacSha256::new_from_slice(password)
        .map_err(|_| DomainError::new("password hash hmac key is invalid"))
}

fn constant_time_eq(left: &[u8], right: &[u8]) -> bool {
    if left.len() != right.len() {
        return false;
    }
    left.iter()
        .zip(right.iter())
        .fold(0_u8, |diff, (left, right)| diff | (left ^ right))
        == 0
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn pbkdf2_sha256_hash_round_trips_password_without_accepting_wrong_password() {
        let hash = Pbkdf2Sha256PasswordHasher::hash_password_with_salt(
            "correct-password",
            b"unit-test-password-salt-0001",
            1_000,
        )
        .unwrap();
        let hasher = Pbkdf2Sha256PasswordHasher;

        assert!(hasher.verify_password("correct-password", &hash).unwrap());
        assert!(!hasher.verify_password("wrong-password", &hash).unwrap());
        assert!(!hasher
            .verify_password("correct-password", "legacy-hash")
            .unwrap());
    }

    #[test]
    fn pbkdf2_sha256_hash_uses_versioned_format() {
        let hash = Pbkdf2Sha256PasswordHasher::hash_password_with_salt(
            "correct-password",
            b"unit-test-password-salt-0002",
            1_000,
        )
        .unwrap();

        assert!(hash.starts_with("pbkdf2-sha256$v=1$i=1000$s="));
        assert!(hash.contains("$h="));
        assert_eq!(
            1_000,
            Pbkdf2Sha256PasswordHasher::default_iterations().min(1_000)
        );
    }

    #[test]
    fn password_hasher_trait_hashes_and_verifies_passwords() {
        let hasher = Pbkdf2Sha256PasswordHasher;
        let hash = hasher
            .hash_password("correct-password", "user-30-credential")
            .unwrap();

        assert!(hasher.verify_password("correct-password", &hash).unwrap());
        assert!(!hasher.verify_password("wrong-password", &hash).unwrap());
    }
}
