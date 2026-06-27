from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any


@dataclass
class RoutingCircuitBreakerPolicy:
    """Routing circuit breaker policy schema exposed by Claw Router."""
    failure_threshold: str
