use serde_json::Value;

#[derive(Debug, Clone, PartialEq)]
pub enum InvocationBody {
    Empty,
    Json(Value),
    Bytes(Vec<u8>),
}

impl InvocationBody {
    pub fn json(value: Value) -> Self {
        Self::Json(value)
    }

    pub fn bytes(value: impl Into<Vec<u8>>) -> Self {
        Self::Bytes(value.into())
    }

    pub fn is_empty(&self) -> bool {
        matches!(self, Self::Empty)
    }
}

impl Default for InvocationBody {
    fn default() -> Self {
        Self::Empty
    }
}
