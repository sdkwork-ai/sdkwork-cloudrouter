from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any


@dataclass
class AdminCacheOperationResponse:
    """Admin cache operation response schema exposed by Claw Router."""
    deleted_entries: str
    operation: str
    refreshed_entries: str
    status: str
    cache_key: Optional[str] = None
    instance_name: Optional[str] = None
    namespace: Optional[str] = None
