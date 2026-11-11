use serde::{Deserialize, Serialize};

use crate::models::{BytedanceTtsRequestParams};

/// ByteDance Seed TTS 2.0 request (`POST /api/v3/tts/unidirectional`). The vendor nests every synthesis field under `req_params`.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct BytedanceSpeechRequest {
    /// Req params field on the bytedance speech request, using the bytedance tts request params module.
    pub req_params: BytedanceTtsRequestParams,
}
