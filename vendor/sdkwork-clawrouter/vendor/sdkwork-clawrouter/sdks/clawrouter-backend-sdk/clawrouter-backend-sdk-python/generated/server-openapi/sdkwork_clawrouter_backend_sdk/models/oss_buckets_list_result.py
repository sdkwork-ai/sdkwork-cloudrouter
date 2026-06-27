from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any

if TYPE_CHECKING:
    from .storage_bucket_list_response import StorageBucketListResponse


@dataclass
class OssBucketsListResult:
    """Oss buckets list result schema exposed by Claw Router."""
    code: str
    data: Optional[StorageBucketListResponse] = None
    msg: Optional[str] = None
