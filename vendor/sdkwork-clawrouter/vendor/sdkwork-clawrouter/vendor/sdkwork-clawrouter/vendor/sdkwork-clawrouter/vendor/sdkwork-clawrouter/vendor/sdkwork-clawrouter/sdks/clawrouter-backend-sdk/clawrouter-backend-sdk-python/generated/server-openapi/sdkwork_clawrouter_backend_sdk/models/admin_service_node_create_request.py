from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any


@dataclass
class AdminServiceNodeCreateRequest:
    """Admin service node create request schema exposed by Claw Router."""
    domain: str
    ip: str
    name: str
    remark: Optional[str] = None
    status: Optional[str] = None
