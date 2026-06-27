from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any

if TYPE_CHECKING:
    from .storage_usage_snapshot import StorageUsageSnapshot


@dataclass
class StorageUsageSnapshotListResponse:
    """Storage usage snapshot list response schema exposed by Claw Router."""
    items: List[StorageUsageSnapshot]
    request_id: str
    next_cursor: Optional[str] = None
