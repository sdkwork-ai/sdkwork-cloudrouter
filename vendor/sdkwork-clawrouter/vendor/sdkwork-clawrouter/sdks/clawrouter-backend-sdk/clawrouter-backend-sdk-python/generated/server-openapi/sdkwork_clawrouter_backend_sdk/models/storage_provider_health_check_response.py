from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any


@dataclass
class StorageProviderHealthCheckResponse:
    """Storage provider health check response schema exposed by Claw Router."""
    healthy: bool
    provider_id: str
    request_id: str
    status: str
    checked_at: Optional[str] = None
