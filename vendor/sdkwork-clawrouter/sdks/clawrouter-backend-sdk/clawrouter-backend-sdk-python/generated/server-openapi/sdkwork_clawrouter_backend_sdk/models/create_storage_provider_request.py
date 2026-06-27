from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any


@dataclass
class CreateStorageProviderRequest:
    """Create storage provider request schema exposed by Claw Router."""
    credential_ref: str
    provider_code: str
    provider_type: str
    endpoint: Optional[str] = None
    endpoint_url: Optional[str] = None
    lifecycle: Optional[bool] = None
    multipart: Optional[bool] = None
    object_lock: Optional[bool] = None
    path_style_enabled: Optional[bool] = None
    region: Optional[str] = None
    supports_lifecycle: Optional[bool] = None
    supports_multipart: Optional[bool] = None
    supports_object_lock: Optional[bool] = None
