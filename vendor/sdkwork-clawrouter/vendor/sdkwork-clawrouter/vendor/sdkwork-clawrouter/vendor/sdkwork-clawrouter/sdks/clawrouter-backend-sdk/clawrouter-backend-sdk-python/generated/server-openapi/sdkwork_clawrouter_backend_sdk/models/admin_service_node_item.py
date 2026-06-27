from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any


@dataclass
class AdminServiceNodeItem:
    """Admin service node item schema exposed by Claw Router."""
    domain: str
    health_status: str
    id: str
    ip: str
    name: str
    remark: str
    status: str
    updated_at: str
