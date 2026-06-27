from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any


@dataclass
class CreateApiKeyRequest:
    """Create api key request schema exposed by Claw Router."""
    channel_group: str
    name: str
    default_for_runtime: Optional[bool] = None
    expires: Optional[str] = None
    ip_limit: Optional[str] = None
    is_unlimited_quota: Optional[bool] = None
    modalities: Optional[List[str]] = None
    quota: Optional[str] = None
