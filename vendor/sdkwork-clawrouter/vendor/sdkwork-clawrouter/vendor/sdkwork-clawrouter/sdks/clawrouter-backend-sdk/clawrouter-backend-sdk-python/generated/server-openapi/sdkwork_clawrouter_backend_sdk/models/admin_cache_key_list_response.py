from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any

if TYPE_CHECKING:
    from .admin_cache_key_item import AdminCacheKeyItem


@dataclass
class AdminCacheKeyListResponse:
    """Admin cache key list response schema exposed by Claw Router."""
    has_more: bool
    instance_name: str
    items: List[AdminCacheKeyItem]
    limit: Optional[str]
    namespace: str
    next_cursor: Optional[str]
    returned_items: str
    scan_complete: bool
    scanned_items: str
