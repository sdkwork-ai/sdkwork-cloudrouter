from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any


@dataclass
class AdminCacheKeyItem:
    """Admin cache key item schema exposed by Claw Router."""
    instance_name: str
    key: str
    namespace: str
    status: str
    expires_in_seconds: Optional[str] = None
