from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any


@dataclass
class AdminTokenLimitCreateRequest:
    """Admin token limit create request schema exposed by Claw Router."""
    burst: int
    key_prefix: str
    rpd: int
    rps: int
    user: str
    status: Optional[str] = None
