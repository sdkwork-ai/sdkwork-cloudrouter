from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any

if TYPE_CHECKING:
    from .admin_cache_instance import AdminCacheInstance
    from .admin_cache_namespace_policy import AdminCacheNamespacePolicy
    from .admin_cache_summary import AdminCacheSummary


@dataclass
class AdminCacheOverviewResponse:
    """Admin cache overview response schema exposed by Claw Router."""
    instances: List[AdminCacheInstance]
    namespace_policies: List[AdminCacheNamespacePolicy]
    summary: AdminCacheSummary
