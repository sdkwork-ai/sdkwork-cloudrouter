from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any

if TYPE_CHECKING:
    from .page_info import PageInfo


@dataclass
class CacheNamespaceKeyPage:
    """Cache namespace key page schema exposed by Claw Router."""
    instance_name: str
    items: List[Dict[str, Any]]
    namespace: str
    page_info: PageInfo
    returned_items: str
    scan_complete: bool
    scanned_items: str
