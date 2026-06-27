from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any


@dataclass
class StorageUsageSnapshot:
    """Storage usage snapshot schema exposed by Claw Router."""
    file_count: str
    id: str
    scope_id: str
    scope_type: str
    snapshot_at: str
    used_bytes: str
    reserved_bytes: Optional[str] = None
    scope: Optional[str] = None
    snapshot_type: Optional[str] = None
