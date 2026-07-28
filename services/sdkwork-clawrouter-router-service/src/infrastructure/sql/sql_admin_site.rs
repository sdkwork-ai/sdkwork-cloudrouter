pub(crate) fn site_status_code(value: &str) -> i32 {
    match value {
        "disabled" => 0,
        _ => 1,
    }
}

pub(crate) fn site_status_label(value: i32) -> String {
    match value {
        0 => "disabled",
        _ => "active",
    }
    .to_owned()
}

pub(crate) fn site_environment_code(value: &str) -> i32 {
    match value {
        "sandbox" => 2,
        _ => 1,
    }
}

pub(crate) fn site_environment_label(value: i32) -> String {
    match value {
        2 => "sandbox",
        _ => "production",
    }
    .to_owned()
}

pub(crate) fn health_status_label(value: i32) -> String {
    match value {
        2 => "healthy",
        3 => "degraded",
        4 => "unhealthy",
        _ => "unknown",
    }
    .to_owned()
}

pub(crate) fn default_endpoint_code(supplier_code: &str) -> String {
    format!("{supplier_code}_ai_model_relay")
}
