from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any


@dataclass
class MiniMaxMusicBaseResp:
    """Mini max music base resp schema exposed by Cloud Router."""
    status_code: Optional[int] = None
    status_msg: Optional[str] = None
