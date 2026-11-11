use serde::{Deserialize, Serialize};

/// Type safe answer schema exposed by Cloud Router.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct TypeSafeAnswer {
    /// Option selected for a choice question.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub choice: Option<String>,

    /// Probability mass concentrated on the reported answer. Reported for choice and score answers; a noul answer carries none.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub confidence: Option<f64>,

    /// Maps each score level index to the level description declared by the question.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub legend: Option<std::collections::HashMap<String, String>>,

    /// Probability that a noul question is true: near 1 is a strong yes, near 0 a strong no, and near 0.5 means the state does not decide it.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub noul: Option<f64>,

    /// Probability assigned to each candidate answer of a choice question, keyed by option.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub probabilities: Option<std::collections::HashMap<String, f64>>,

    /// Position on the score question's ordered levels. The value can fall between two levels.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub score: Option<f64>,

    /// Question primitive that produced this answer.
    pub r#type: String,
}
