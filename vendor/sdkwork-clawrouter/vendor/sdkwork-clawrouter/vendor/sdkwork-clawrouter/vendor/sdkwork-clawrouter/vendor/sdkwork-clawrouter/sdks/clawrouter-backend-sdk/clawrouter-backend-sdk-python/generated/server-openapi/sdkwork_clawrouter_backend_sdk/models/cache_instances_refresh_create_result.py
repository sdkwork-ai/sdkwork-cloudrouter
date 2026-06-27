from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any

if TYPE_CHECKING:
    from .admin_cache_operation_response import AdminCacheOperationResponse


@dataclass
class CacheInstancesRefreshCreateResult:
    """Cache instances refresh create result schema exposed by Claw Router."""
    code: str
    data: Optional[AdminCacheOperationResponse] = None
    msg: Optional[str] = None
