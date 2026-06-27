from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any


@dataclass
class AdminSiteConnectionCheckResponse:
    """Admin site connection check response schema exposed by Claw Router."""
    checked_at: str
    health_status: str
    site_id: str
    status: str
    latency_ms: Optional[str] = None
    message: Optional[str] = None
