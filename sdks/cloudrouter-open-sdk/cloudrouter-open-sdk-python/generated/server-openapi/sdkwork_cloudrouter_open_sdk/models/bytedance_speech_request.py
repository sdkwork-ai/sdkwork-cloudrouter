from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any

if TYPE_CHECKING:
    from .bytedance_tts_request_params import BytedanceTtsRequestParams


@dataclass
class BytedanceSpeechRequest:
    """ByteDance Seed TTS 2.0 request (`POST /api/v3/tts/unidirectional`). The vendor nests every synthesis field under `req_params`."""
    req_params: BytedanceTtsRequestParams
