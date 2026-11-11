use serde::{Deserialize, Serialize};

use crate::models::{TypeSafeAnswer, TypeSafeUsage};

/// Type safe system one response schema exposed by Cloud Router.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct TypeSafeSystemOneResponse {
    /// One typed answer per requested question, keyed by the same question id that was sent.
    pub answers: std::collections::HashMap<String, TypeSafeAnswer>,

    /// Versioned model id that answered the request, so callers can log which release produced each result.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub model: Option<String>,

    /// Usage field on the type safe system one response, using the type safe usage module.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub usage: Option<TypeSafeUsage>,
}
