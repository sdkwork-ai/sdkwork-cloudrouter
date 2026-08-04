use crate::application::{ApiKeySecretGenerator, EntityUuidGenerator};
use crate::domain::{DomainError, DomainResult};

#[derive(Debug, Default, Clone)]
pub struct OsApiKeySecretGenerator;

impl EntityUuidGenerator for OsApiKeySecretGenerator {
    fn generate_entity_uuid(&self) -> DomainResult<String> {
        let mut bytes = [0_u8; 16];
        fill_random_bytes(&mut bytes)?;
        Ok(hex::encode(bytes))
    }
}

impl ApiKeySecretGenerator for OsApiKeySecretGenerator {
    fn generate_api_key_secret(&self) -> DomainResult<String> {
        let mut bytes = [0_u8; 32];
        fill_random_bytes(&mut bytes)?;
        Ok(format!("sk-{}", hex::encode(bytes)))
    }
}

#[cfg(windows)]
fn fill_random_bytes(bytes: &mut [u8]) -> DomainResult<()> {
    use std::ffi::c_void;
    use std::ptr::null_mut;

    const BCRYPT_USE_SYSTEM_PREFERRED_RNG: u32 = 0x00000002;

    #[link(name = "bcrypt")]
    extern "system" {
        fn BCryptGenRandom(
            h_algorithm: *mut c_void,
            pb_buffer: *mut u8,
            cb_buffer: u32,
            dw_flags: u32,
        ) -> i32;
    }

    let status = unsafe {
        BCryptGenRandom(
            null_mut(),
            bytes.as_mut_ptr(),
            bytes.len() as u32,
            BCRYPT_USE_SYSTEM_PREFERRED_RNG,
        )
    };
    if status < 0 {
        Err(DomainError::new("failed to generate secure random bytes"))
    } else {
        Ok(())
    }
}

#[cfg(not(windows))]
fn fill_random_bytes(bytes: &mut [u8]) -> DomainResult<()> {
    use std::io::Read;

    let mut file = std::fs::File::open("/dev/urandom")
        .map_err(|_| DomainError::new("failed to open operating system random source"))?;
    file.read_exact(bytes)
        .map_err(|_| DomainError::new("failed to read secure random bytes"))
}
