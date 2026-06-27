from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any


@dataclass
class AdminMcpHealthCheckResponse:
    """Admin mcp health check response schema exposed by Claw Router."""
    checked_at: str
    health_status: str
    healthy: bool
    server_id: str
    error_masked: Optional[str] = None
    latency_ms: Optional[str] = None
