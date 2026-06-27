from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any


@dataclass
class AdminModelLimitCreateRequest:
    """Admin model limit create request schema exposed by Claw Router."""
    channel_group: str
    model: str
    rpm: int
    tpm: int
    status: Optional[str] = None
