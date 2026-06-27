from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any

if TYPE_CHECKING:
    from .admin_channel_credential_item import AdminChannelCredentialItem
    from .provider_circuit_breaker_policy import ProviderCircuitBreakerPolicy
    from .provider_retry_policy import ProviderRetryPolicy


@dataclass
class AdminChannelItem:
    """Persisted channel snapshot returned after the provider health probe. Admin management responses may return the stored plaintext provider API key for channel credential relay operations."""
    access_type: str
    balance: str
    capabilities: List[str]
    channel_id: str
    channel_type: str
    created_at: str
    credential_rotation: str
    credentials: List[AdminChannelCredentialItem]
    errors: str
    id: str
    is_multimodal: bool
    name: str
    protocol: str
    resource_codes: List[str]
    status: str
    vendor: str
    weight: str
    circuit_breaker_policy: Optional[ProviderCircuitBreakerPolicy] = None
    expires_at: Optional[str] = None
    retry_policy: Optional[ProviderRetryPolicy] = None
    timeout_ms: Optional[str] = None
