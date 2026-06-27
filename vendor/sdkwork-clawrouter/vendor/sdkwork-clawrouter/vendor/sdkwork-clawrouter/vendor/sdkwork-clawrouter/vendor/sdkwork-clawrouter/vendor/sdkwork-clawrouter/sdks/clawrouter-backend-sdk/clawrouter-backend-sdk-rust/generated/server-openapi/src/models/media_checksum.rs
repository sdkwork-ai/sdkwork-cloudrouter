use serde::{Deserialize, Serialize};

/// Media checksum schema exposed by Claw Router.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct MediaChecksum {
    /// Algorithm field on media checksum.
    pub algorithm: String,

    /// Value field on media checksum.
    pub value: String,
}
