from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any

if TYPE_CHECKING:
    from .routing_circuit_breaker_policy import RoutingCircuitBreakerPolicy
    from .routing_retry_policy import RoutingRetryPolicy


@dataclass
class RoutingChannelItem:
    """Routing channel item schema exposed by Claw Router."""
    access_type: str
    api_key: str
    balance: str
    base_url: str
    capabilities: List[str]
    errors: str
    id: str
    is_multimodal: bool
    latency: str
    models: List[str]
    name: str
    protocol: str
    provider: str
    provider_code: str
    rpm: str
    status: str
    vendor: str
    weight: str
    circuit_breaker_policy: Optional[RoutingCircuitBreakerPolicy] = None
    retry_policy: Optional[RoutingRetryPolicy] = None
    timeout_ms: Optional[str] = None
