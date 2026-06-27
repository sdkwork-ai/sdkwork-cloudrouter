from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any


@dataclass
class AdminMcpToolUpdateRequest:
    """Admin mcp tool update request schema exposed by Claw Router."""
    description: Optional[str] = None
    enabled: Optional[bool] = None
    input_schema: Optional[Dict[str, str]] = None
    name: Optional[str] = None
    output_schema: Optional[Dict[str, str]] = None
    rate_limit_policy: Optional[Dict[str, str]] = None
    requires_approval: Optional[bool] = None
    risk_level: Optional[str] = None
    sort_weight: Optional[int] = None
    status: Optional[str] = None
