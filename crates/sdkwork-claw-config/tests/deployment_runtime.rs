use sdkwork_claw_config::{
    DeploymentMode, DeploymentProfile, DeploymentRuntime, RuntimeTarget, RuntimeTomlConfig,
};
use std::ffi::OsString;
use std::sync::{Mutex, MutexGuard, OnceLock};

const LIFECYCLE_ENV_KEYS: [&str; 3] = [
    DeploymentProfile::ENV_DEPLOYMENT_PROFILE,
    RuntimeTarget::ENV_RUNTIME_TARGET,
    DeploymentMode::ENV_DEPLOYMENT_MODE,
];

#[test]
fn standalone_container_derives_docker_mode() {
    let _lock = lock_environment();
    let _env = LifecycleEnvGuard::set(&[
        (
            DeploymentProfile::ENV_DEPLOYMENT_PROFILE,
            Some(OsString::from("standalone")),
        ),
        (
            RuntimeTarget::ENV_RUNTIME_TARGET,
            Some(OsString::from("container")),
        ),
    ]);

    let runtime = DeploymentRuntime::resolve(None).unwrap();

    assert_eq!(DeploymentProfile::Standalone, runtime.profile);
    assert_eq!(RuntimeTarget::Container, runtime.target);
    assert_eq!(DeploymentMode::Docker, runtime.mode);
}

#[test]
fn cloud_container_derives_kubernetes_mode() {
    let _lock = lock_environment();
    let _env = LifecycleEnvGuard::set(&[
        (
            DeploymentProfile::ENV_DEPLOYMENT_PROFILE,
            Some(OsString::from("cloud")),
        ),
        (
            RuntimeTarget::ENV_RUNTIME_TARGET,
            Some(OsString::from("container")),
        ),
    ]);

    let runtime = DeploymentRuntime::resolve(None).unwrap();

    assert_eq!(DeploymentProfile::Cloud, runtime.profile);
    assert_eq!(RuntimeTarget::Container, runtime.target);
    assert_eq!(DeploymentMode::Kubernetes, runtime.mode);
}

#[test]
fn standalone_test_runner_uses_the_canonical_runtime_target() {
    let _lock = lock_environment();
    let _env = LifecycleEnvGuard::set(&[
        (
            DeploymentProfile::ENV_DEPLOYMENT_PROFILE,
            Some(OsString::from("standalone")),
        ),
        (
            RuntimeTarget::ENV_RUNTIME_TARGET,
            Some(OsString::from("test-runner")),
        ),
    ]);

    let runtime = DeploymentRuntime::resolve(None).unwrap();

    assert_eq!(RuntimeTarget::TestRunner, runtime.target);
    assert_eq!("test-runner", runtime.target.as_str());
    assert_eq!(DeploymentMode::Server, runtime.mode);
}

#[test]
fn canonical_toml_pair_resolves_standalone_container() {
    let _lock = lock_environment();
    let _env = LifecycleEnvGuard::set(&[]);
    let config = RuntimeTomlConfig::from_toml_str(
        r#"
[runtime]
deployment_profile = "standalone"
runtime_target = "container"
"#,
    )
    .unwrap();

    let runtime = DeploymentRuntime::resolve(Some(&config)).unwrap();

    assert_eq!(DeploymentProfile::Standalone, runtime.profile);
    assert_eq!(RuntimeTarget::Container, runtime.target);
    assert_eq!(DeploymentMode::Docker, runtime.mode);
}

#[test]
fn deployment_mode_from_runtime_toml_uses_the_canonical_pair() {
    let _lock = lock_environment();
    let _env = LifecycleEnvGuard::set(&[]);
    let config = RuntimeTomlConfig::from_toml_str(
        r#"
[runtime]
deployment_profile = "cloud"
runtime_target = "container"
"#,
    )
    .unwrap();

    let mode = DeploymentMode::from_env_or_runtime_toml(Some(&config)).unwrap();

    assert_eq!(DeploymentMode::Kubernetes, mode);
}

#[test]
fn canonical_environment_override_is_absent_when_the_pair_is_not_configured() {
    let _lock = lock_environment();
    let _env = LifecycleEnvGuard::set(&[]);

    let runtime = DeploymentRuntime::from_env_override().unwrap();

    assert_eq!(None, runtime);
}

#[test]
fn configured_runtime_resolver_uses_the_canonical_toml_pair() {
    let _lock = lock_environment();
    let _env = LifecycleEnvGuard::set(&[]);
    let config = RuntimeTomlConfig::from_toml_str(
        r#"
[runtime]
deployment_profile = "standalone"
runtime_target = "desktop"
"#,
    )
    .unwrap();

    let runtime = DeploymentRuntime::resolve_configured(Some(&config))
        .unwrap()
        .expect("canonical TOML pair should configure a runtime");

    assert_eq!(DeploymentProfile::Standalone, runtime.profile);
    assert_eq!(RuntimeTarget::Desktop, runtime.target);
    assert_eq!(DeploymentMode::Desktop, runtime.mode);
}

#[test]
fn configured_runtime_resolver_prefers_the_canonical_environment_pair() {
    let _lock = lock_environment();
    let _env = LifecycleEnvGuard::set(&[
        (
            DeploymentProfile::ENV_DEPLOYMENT_PROFILE,
            Some(OsString::from("standalone")),
        ),
        (
            RuntimeTarget::ENV_RUNTIME_TARGET,
            Some(OsString::from("desktop")),
        ),
    ]);
    let config = RuntimeTomlConfig::from_toml_str(
        r#"
[runtime]
deployment_profile = "cloud"
runtime_target = "container"
"#,
    )
    .unwrap();

    let runtime = DeploymentRuntime::resolve_configured(Some(&config))
        .unwrap()
        .expect("canonical environment pair should configure a runtime");

    assert_eq!(DeploymentProfile::Standalone, runtime.profile);
    assert_eq!(RuntimeTarget::Desktop, runtime.target);
}

#[test]
fn configured_runtime_resolver_returns_none_without_a_canonical_pair() {
    let _lock = lock_environment();
    let _env = LifecycleEnvGuard::set(&[]);
    let config = RuntimeTomlConfig::from_toml_str(
        r#"
[runtime]
deployment_mode = "desktop"
"#,
    )
    .unwrap();

    assert_eq!(
        None,
        DeploymentRuntime::resolve_configured(Some(&config)).unwrap()
    );
    assert_eq!(None, DeploymentRuntime::resolve_configured(None).unwrap());
}

#[test]
fn configured_runtime_resolver_rejects_partial_toml_pairs() {
    let _lock = lock_environment();
    let _env = LifecycleEnvGuard::set(&[]);

    for (toml, missing_label) in [
        (
            "[runtime]\ndeployment_profile = \"standalone\"\n",
            "[runtime].runtime_target",
        ),
        (
            "[runtime]\nruntime_target = \"desktop\"\n",
            "[runtime].deployment_profile",
        ),
    ] {
        let config = RuntimeTomlConfig::from_toml_str(toml).unwrap();
        let error = DeploymentRuntime::resolve_configured(Some(&config)).unwrap_err();

        assert!(error.contains(missing_label));
    }
}

#[test]
fn canonical_toml_pair_overrides_legacy_deployment_mode_env() {
    let _lock = lock_environment();
    let _env = LifecycleEnvGuard::set(&[(
        DeploymentMode::ENV_DEPLOYMENT_MODE,
        Some(OsString::from("server")),
    )]);
    let config = RuntimeTomlConfig::from_toml_str(
        r#"
[runtime]
deployment_profile = "cloud"
runtime_target = "container"
"#,
    )
    .unwrap();

    let runtime = DeploymentRuntime::resolve(Some(&config)).unwrap();

    assert_eq!(DeploymentProfile::Cloud, runtime.profile);
    assert_eq!(RuntimeTarget::Container, runtime.target);
    assert_eq!(DeploymentMode::Kubernetes, runtime.mode);
}

#[test]
fn canonical_toml_profile_without_target_is_rejected() {
    let _lock = lock_environment();
    let _env = LifecycleEnvGuard::set(&[]);
    let config = RuntimeTomlConfig::from_toml_str(
        r#"
[runtime]
deployment_profile = "standalone"
"#,
    )
    .unwrap();

    let error = DeploymentRuntime::resolve(Some(&config)).unwrap_err();

    assert!(error.contains("[runtime].runtime_target"));
}

#[test]
fn canonical_toml_target_without_profile_is_rejected() {
    let _lock = lock_environment();
    let _env = LifecycleEnvGuard::set(&[]);
    let config = RuntimeTomlConfig::from_toml_str(
        r#"
[runtime]
runtime_target = "container"
"#,
    )
    .unwrap();

    let error = DeploymentRuntime::resolve(Some(&config)).unwrap_err();

    assert!(error.contains("[runtime].deployment_profile"));
}

#[test]
fn canonical_env_profile_does_not_borrow_target_from_toml() {
    let _lock = lock_environment();
    let _env = LifecycleEnvGuard::set(&[(
        DeploymentProfile::ENV_DEPLOYMENT_PROFILE,
        Some(OsString::from("cloud")),
    )]);
    let config = RuntimeTomlConfig::from_toml_str(
        r#"
[runtime]
deployment_profile = "standalone"
runtime_target = "container"
"#,
    )
    .unwrap();

    let error = DeploymentRuntime::resolve(Some(&config)).unwrap_err();

    assert!(error.contains(RuntimeTarget::ENV_RUNTIME_TARGET));
}

#[test]
fn canonical_env_target_does_not_borrow_profile_from_toml() {
    let _lock = lock_environment();
    let _env = LifecycleEnvGuard::set(&[(
        RuntimeTarget::ENV_RUNTIME_TARGET,
        Some(OsString::from("container")),
    )]);
    let config = RuntimeTomlConfig::from_toml_str(
        r#"
[runtime]
deployment_profile = "standalone"
runtime_target = "server"
"#,
    )
    .unwrap();

    let error = DeploymentRuntime::resolve(Some(&config)).unwrap_err();

    assert!(error.contains(DeploymentProfile::ENV_DEPLOYMENT_PROFILE));
}

#[test]
fn deployment_mode_from_env_propagates_invalid_canonical_tuple() {
    let _lock = lock_environment();
    let _env = LifecycleEnvGuard::set(&[(
        DeploymentProfile::ENV_DEPLOYMENT_PROFILE,
        Some(OsString::from("cloud")),
    )]);

    let error = DeploymentMode::from_env().unwrap_err();

    assert!(error.contains(RuntimeTarget::ENV_RUNTIME_TARGET));
}

#[test]
fn canonical_env_pair_atomically_overrides_toml() {
    let _lock = lock_environment();
    let _env = LifecycleEnvGuard::set(&[
        (
            DeploymentProfile::ENV_DEPLOYMENT_PROFILE,
            Some(OsString::from("standalone")),
        ),
        (
            RuntimeTarget::ENV_RUNTIME_TARGET,
            Some(OsString::from("container")),
        ),
    ]);
    let config = RuntimeTomlConfig::from_toml_str(
        r#"
[runtime]
deployment_profile = "cloud"
runtime_target = "container"
deployment_mode = "cloud"
"#,
    )
    .unwrap();

    let runtime = DeploymentRuntime::resolve(Some(&config)).unwrap();

    assert_eq!(DeploymentProfile::Standalone, runtime.profile);
    assert_eq!(RuntimeTarget::Container, runtime.target);
    assert_eq!(DeploymentMode::Docker, runtime.mode);
}

#[test]
fn blank_canonical_env_values_are_rejected() {
    let _lock = lock_environment();

    for (blank_key, valid_key, valid_value) in [
        (
            DeploymentProfile::ENV_DEPLOYMENT_PROFILE,
            RuntimeTarget::ENV_RUNTIME_TARGET,
            "container",
        ),
        (
            RuntimeTarget::ENV_RUNTIME_TARGET,
            DeploymentProfile::ENV_DEPLOYMENT_PROFILE,
            "standalone",
        ),
    ] {
        let _env = LifecycleEnvGuard::set(&[
            (blank_key, Some(OsString::from("   "))),
            (valid_key, Some(OsString::from(valid_value))),
        ]);

        let error = DeploymentRuntime::resolve(None).unwrap_err();

        assert!(error.contains(blank_key));
        assert!(error.contains("must not be blank"));
    }
}

#[test]
fn unknown_canonical_env_values_are_rejected() {
    let _lock = lock_environment();

    for (unknown_key, unknown_value, valid_key, valid_value) in [
        (
            DeploymentProfile::ENV_DEPLOYMENT_PROFILE,
            "private",
            RuntimeTarget::ENV_RUNTIME_TARGET,
            "container",
        ),
        (
            RuntimeTarget::ENV_RUNTIME_TARGET,
            "docker",
            DeploymentProfile::ENV_DEPLOYMENT_PROFILE,
            "standalone",
        ),
    ] {
        let _env = LifecycleEnvGuard::set(&[
            (unknown_key, Some(OsString::from(unknown_value))),
            (valid_key, Some(OsString::from(valid_value))),
        ]);

        let error = DeploymentRuntime::resolve(None).unwrap_err();

        assert!(error.contains(unknown_key));
    }
}

#[cfg(any(unix, windows))]
#[test]
fn non_unicode_canonical_env_values_are_rejected() {
    let _lock = lock_environment();

    for (invalid_key, valid_key, valid_value) in [
        (
            DeploymentProfile::ENV_DEPLOYMENT_PROFILE,
            RuntimeTarget::ENV_RUNTIME_TARGET,
            "container",
        ),
        (
            RuntimeTarget::ENV_RUNTIME_TARGET,
            DeploymentProfile::ENV_DEPLOYMENT_PROFILE,
            "standalone",
        ),
    ] {
        let _env = LifecycleEnvGuard::set(&[
            (invalid_key, Some(non_unicode_os_string())),
            (valid_key, Some(OsString::from(valid_value))),
        ]);

        let error = DeploymentRuntime::resolve(None).unwrap_err();

        assert!(error.contains(invalid_key));
        assert!(error.contains("valid Unicode"));
    }
}

fn lock_environment() -> MutexGuard<'static, ()> {
    static LOCK: OnceLock<Mutex<()>> = OnceLock::new();
    LOCK.get_or_init(|| Mutex::new(()))
        .lock()
        .unwrap_or_else(|poisoned| poisoned.into_inner())
}

struct LifecycleEnvGuard {
    previous: Vec<(&'static str, Option<OsString>)>,
}

impl LifecycleEnvGuard {
    fn set(values: &[(&'static str, Option<OsString>)]) -> Self {
        let previous = LIFECYCLE_ENV_KEYS
            .iter()
            .map(|key| (*key, std::env::var_os(key)))
            .collect::<Vec<_>>();

        for key in LIFECYCLE_ENV_KEYS {
            let value = values
                .iter()
                .find_map(|(candidate, value)| (*candidate == key).then_some(value))
                .cloned()
                .flatten();
            match value {
                Some(value) => unsafe { std::env::set_var(key, value) },
                None => unsafe { std::env::remove_var(key) },
            }
        }

        Self { previous }
    }
}

impl Drop for LifecycleEnvGuard {
    fn drop(&mut self) {
        for (key, value) in self.previous.drain(..) {
            match value {
                Some(value) => unsafe { std::env::set_var(key, value) },
                None => unsafe { std::env::remove_var(key) },
            }
        }
    }
}

#[cfg(unix)]
fn non_unicode_os_string() -> OsString {
    use std::os::unix::ffi::OsStringExt;

    OsString::from_vec(vec![0xff])
}

#[cfg(windows)]
fn non_unicode_os_string() -> OsString {
    use std::os::windows::ffi::OsStringExt;

    OsString::from_wide(&[0xd800])
}
