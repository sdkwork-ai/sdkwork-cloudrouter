from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any


@dataclass
class AdminServiceNodeUpdateRequest:
    """Admin service node update request schema exposed by Claw Router."""
    domain: Optional[str] = None
    ip: Optional[str] = None
    name: Optional[str] = None
    remark: Optional[str] = None
