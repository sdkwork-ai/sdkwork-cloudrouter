from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any

if TYPE_CHECKING:
    from .admin_cache_key_list_response import AdminCacheKeyListResponse


@dataclass
class CacheNamespacesKeysListResult:
    """Cache namespaces keys list result schema exposed by Claw Router."""
    code: str
    data: Optional[AdminCacheKeyListResponse] = None
    msg: Optional[str] = None
