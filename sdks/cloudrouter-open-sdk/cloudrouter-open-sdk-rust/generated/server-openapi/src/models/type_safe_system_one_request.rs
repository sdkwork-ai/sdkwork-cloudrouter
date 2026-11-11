use serde::{Deserialize, Serialize};

use crate::models::{TypeSafeQuestion};

/// Type safe system one request schema exposed by Cloud Router.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct TypeSafeSystemOneRequest {
    /// Model name to evaluate with. Cloud Router selects the routed catalog model for the request; sending a name here overrides it. Versioned ids such as jev-1.13.0 are accepted alongside the published aliases.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub model: Option<String>,

    /// Typed questions keyed by a caller-chosen question id. Every question is evaluated against the same state in parallel and in isolation.
    pub questions: std::collections::HashMap<String, TypeSafeQuestion>,

    /// Context the questions are evaluated against: a text string, an array of text values, or a JSON object whose fields the instructions can reference by dot path.
    pub state: String,
}
