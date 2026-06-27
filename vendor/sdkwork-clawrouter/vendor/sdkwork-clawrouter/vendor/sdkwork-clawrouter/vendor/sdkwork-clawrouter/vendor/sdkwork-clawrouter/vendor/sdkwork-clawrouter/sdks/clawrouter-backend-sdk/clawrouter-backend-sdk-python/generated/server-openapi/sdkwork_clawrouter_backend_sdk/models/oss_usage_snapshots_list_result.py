from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any

if TYPE_CHECKING:
    from .storage_usage_snapshot_list_response import StorageUsageSnapshotListResponse


@dataclass
class OssUsageSnapshotsListResult:
    """Oss usage snapshots list result schema exposed by Claw Router."""
    code: str
    data: Optional[StorageUsageSnapshotListResponse] = None
    msg: Optional[str] = None
