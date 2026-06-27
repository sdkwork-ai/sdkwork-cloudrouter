from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any

if TYPE_CHECKING:
    from .admin_channel_credential_input import AdminChannelCredentialInput
    from .provider_circuit_breaker_policy import ProviderCircuitBreakerPolicy
    from .provider_retry_policy import ProviderRetryPolicy


@dataclass
class AdminChannelUpdateRequest:
    """Admin channel update request schema exposed by Claw Router."""
    id: str
    access_type: Optional[str] = None
    capabilities: Optional[List[str]] = None
    channel_type: Optional[str] = None
    circuit_breaker_policy: Optional[ProviderCircuitBreakerPolicy] = None
    credential_rotation: Optional[str] = None
    credentials: Optional[List[AdminChannelCredentialInput]] = None
    expires_at: Optional[str] = None
    name: Optional[str] = None
    protocol: Optional[str] = None
    resource_codes: Optional[List[str]] = None
    retry_policy: Optional[ProviderRetryPolicy] = None
    status: Optional[str] = None
    timeout_ms: Optional[str] = None
    vendor: Optional[str] = None
    weight: Optional[str] = None
