from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any

if TYPE_CHECKING:
    from .admin_channel_credential_input import AdminChannelCredentialInput
    from .provider_circuit_breaker_policy import ProviderCircuitBreakerPolicy
    from .provider_retry_policy import ProviderRetryPolicy


@dataclass
class AdminChannelCreateRequest:
    """Admin channel create request schema exposed by Claw Router."""
    credentials: List[AdminChannelCredentialInput]
    name: str
    vendor: str
    access_type: Optional[str] = None
    capabilities: Optional[List[str]] = None
    channel_type: Optional[str] = None
    circuit_breaker_policy: Optional[ProviderCircuitBreakerPolicy] = None
    credential_rotation: Optional[str] = None
    expires_at: Optional[str] = None
    protocol: Optional[str] = None
    resource_codes: Optional[List[str]] = None
    retry_policy: Optional[ProviderRetryPolicy] = None
    status: Optional[str] = None
    timeout_ms: Optional[str] = None
    weight: Optional[str] = None
