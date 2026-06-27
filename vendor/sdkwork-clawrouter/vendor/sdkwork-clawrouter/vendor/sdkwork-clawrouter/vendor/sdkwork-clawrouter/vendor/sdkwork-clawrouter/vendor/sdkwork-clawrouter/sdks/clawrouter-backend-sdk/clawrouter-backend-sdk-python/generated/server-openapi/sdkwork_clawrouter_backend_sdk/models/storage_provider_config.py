from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any


@dataclass
class StorageProviderConfig:
    """Storage provider config schema exposed by Claw Router."""
    credential_ref: str
    health: str
    id: str
    provider_code: str
    provider_type: str
    status: str
    created_at: Optional[str] = None
    endpoint: Optional[str] = None
    endpoint_url: Optional[str] = None
    health_status: Optional[str] = None
    last_health_check_at: Optional[str] = None
    lifecycle: Optional[bool] = None
    multipart: Optional[bool] = None
    object_lock: Optional[bool] = None
    path_style_enabled: Optional[bool] = None
    region: Optional[str] = None
    supports_lifecycle: Optional[bool] = None
    supports_multipart: Optional[bool] = None
    supports_object_lock: Optional[bool] = None
    updated_at: Optional[str] = None
