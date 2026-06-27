from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any


@dataclass
class AppApiKeyItem:
    """Updated API key metadata. Authenticated owner management responses include copyableKey for console copy actions."""
    channel_group: str
    created: str
    default_for_runtime: bool
    expires: str
    id: str
    ip_limit: str
    masked_key: str
    modalities: List[str]
    name: str
    quota: str
    status: str
    used_quota: str
    channel_group_name: Optional[str] = None
    copyable_key: Optional[str] = None
    rate: Optional[str] = None
