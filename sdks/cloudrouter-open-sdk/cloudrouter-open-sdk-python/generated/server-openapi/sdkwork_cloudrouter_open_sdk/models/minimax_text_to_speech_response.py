from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any

if TYPE_CHECKING:
    from .minimax_base_resp import MinimaxBaseResp


@dataclass
class MinimaxTextToSpeechResponse:
    """MiniMax T2A v2 response. data.audio is hex-encoded audio; usage_characters is the billed count."""
    base_resp: Optional[MinimaxBaseResp] = None
    data: Optional[Dict[str, str]] = None
    extra_info: Optional[Dict[str, str]] = None
    trace_id: Optional[str] = None
