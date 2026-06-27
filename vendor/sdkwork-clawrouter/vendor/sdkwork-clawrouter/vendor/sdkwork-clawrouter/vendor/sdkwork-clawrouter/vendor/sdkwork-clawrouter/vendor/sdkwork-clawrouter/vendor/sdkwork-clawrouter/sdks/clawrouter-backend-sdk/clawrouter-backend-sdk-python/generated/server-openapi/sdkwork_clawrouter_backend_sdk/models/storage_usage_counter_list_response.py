from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any

if TYPE_CHECKING:
    from .storage_usage_counter import StorageUsageCounter


@dataclass
class StorageUsageCounterListResponse:
    """Storage usage counter list response schema exposed by Claw Router."""
    items: List[StorageUsageCounter]
    request_id: str
    next_cursor: Optional[str] = None
