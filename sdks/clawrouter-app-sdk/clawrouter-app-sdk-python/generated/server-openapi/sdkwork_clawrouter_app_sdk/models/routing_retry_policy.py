from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any


@dataclass
class RoutingRetryPolicy:
    """Routing retry policy schema exposed by Claw Router."""
    backoff_ms: str
    max_attempts: str
    retryable_status_codes: List[str]
