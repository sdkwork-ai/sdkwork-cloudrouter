from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any

if TYPE_CHECKING:
    from .minimax_base_resp import MinimaxBaseResp
    from .minimax_image_data import MinimaxImageData


@dataclass
class MinimaxImageGenerationResponse:
    """MiniMax image generation response."""
    base_resp: Optional[MinimaxBaseResp] = None
    data: Optional[MinimaxImageData] = None
    id: Optional[str] = None
    metadata: Optional[Dict[str, str]] = None
