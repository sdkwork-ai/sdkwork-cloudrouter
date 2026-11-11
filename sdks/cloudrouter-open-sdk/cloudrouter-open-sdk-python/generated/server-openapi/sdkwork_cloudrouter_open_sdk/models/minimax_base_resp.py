from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any


@dataclass
class MinimaxBaseResp:
    """MiniMax business status envelope returned by every media endpoint."""
    status_code: Optional[int] = None
    status_msg: Optional[str] = None
