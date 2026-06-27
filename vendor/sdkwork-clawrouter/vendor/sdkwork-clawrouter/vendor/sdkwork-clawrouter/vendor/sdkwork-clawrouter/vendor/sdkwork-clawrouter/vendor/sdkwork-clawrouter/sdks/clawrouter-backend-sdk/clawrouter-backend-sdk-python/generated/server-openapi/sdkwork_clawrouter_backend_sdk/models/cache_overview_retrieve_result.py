from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any

if TYPE_CHECKING:
    from .admin_cache_overview_response import AdminCacheOverviewResponse


@dataclass
class CacheOverviewRetrieveResult:
    """Cache overview retrieve result schema exposed by Claw Router."""
    code: str
    data: Optional[AdminCacheOverviewResponse] = None
    msg: Optional[str] = None
