from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any

if TYPE_CHECKING:
    from .cache_namespace_key_page import CacheNamespaceKeyPage


@dataclass
class CacheNamespacesKeysListResult:
    """Cache namespaces keys list result schema exposed by Claw Router."""
    code: int
    data: Any
    trace_id: str
