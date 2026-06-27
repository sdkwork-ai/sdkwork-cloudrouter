from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any


@dataclass
class AdminIpLimitCreateRequest:
    """Admin ip limit create request schema exposed by Claw Router."""
    block_duration: str
    rpm: int
    rps: int
    rule_name: str
    target_ip: str
    status: Optional[str] = None
