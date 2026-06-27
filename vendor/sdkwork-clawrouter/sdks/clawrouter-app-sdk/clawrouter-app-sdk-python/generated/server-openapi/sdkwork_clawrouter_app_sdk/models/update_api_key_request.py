from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any


@dataclass
class UpdateApiKeyRequest:
    """Update api key request schema exposed by Claw Router."""
    channel_group: Optional[str] = None
    default_for_runtime: Optional[bool] = None
    expires: Optional[str] = None
    ip_limit: Optional[str] = None
    is_unlimited_quota: Optional[bool] = None
    modalities: Optional[List[str]] = None
    name: Optional[str] = None
    quota: Optional[str] = None
