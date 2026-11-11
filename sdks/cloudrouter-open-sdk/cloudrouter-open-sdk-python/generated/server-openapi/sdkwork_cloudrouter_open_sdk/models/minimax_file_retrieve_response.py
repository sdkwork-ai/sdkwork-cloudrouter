from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any

if TYPE_CHECKING:
    from .minimax_base_resp import MinimaxBaseResp


@dataclass
class MinimaxFileRetrieveResponse:
    """MiniMax file metadata and its download URL."""
    base_resp: Optional[MinimaxBaseResp] = None
    file: Optional[Dict[str, str]] = None
