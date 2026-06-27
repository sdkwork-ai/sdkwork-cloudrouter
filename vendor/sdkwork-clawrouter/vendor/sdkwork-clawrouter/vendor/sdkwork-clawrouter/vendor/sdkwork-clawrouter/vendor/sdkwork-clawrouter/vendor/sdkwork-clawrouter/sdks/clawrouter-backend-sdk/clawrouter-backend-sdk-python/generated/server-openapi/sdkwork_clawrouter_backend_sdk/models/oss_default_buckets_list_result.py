from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any

if TYPE_CHECKING:
    from .storage_default_bucket_list_response import StorageDefaultBucketListResponse


@dataclass
class OssDefaultBucketsListResult:
    """Oss default buckets list result schema exposed by Claw Router."""
    code: str
    data: Optional[StorageDefaultBucketListResponse] = None
    msg: Optional[str] = None
