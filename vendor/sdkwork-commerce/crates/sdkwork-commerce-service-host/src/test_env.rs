#[cfg(test)]
use std::collections::HashMap;
#[cfg(test)]
use std::sync::{Mutex, MutexGuard};

#[cfg(test)]
static ENV_TEST_LOCK: Mutex<()> = Mutex::new(());

#[cfg(test)]
pub struct EnvGuard {
    _lock: MutexGuard<'static, ()>,
    saved: HashMap<String, Option<String>>,
}

#[cfg(test)]
impl EnvGuard {
    pub fn isolate(vars: &[&str]) -> Self {
        let _lock = ENV_TEST_LOCK.lock().expect("env test lock poisoned");
        let mut saved = HashMap::with_capacity(vars.len());
        for key in vars {
            let previous = std::env::var(key).ok();
            std::env::remove_var(key);
            saved.insert(key.to_string(), previous);
        }
        Self { _lock, saved }
    }
}

#[cfg(test)]
impl Drop for EnvGuard {
    fn drop(&mut self) {
        for (key, previous) in &self.saved {
            match previous {
                Some(value) => std::env::set_var(key, value),
                None => std::env::remove_var(key),
            }
        }
    }
}
