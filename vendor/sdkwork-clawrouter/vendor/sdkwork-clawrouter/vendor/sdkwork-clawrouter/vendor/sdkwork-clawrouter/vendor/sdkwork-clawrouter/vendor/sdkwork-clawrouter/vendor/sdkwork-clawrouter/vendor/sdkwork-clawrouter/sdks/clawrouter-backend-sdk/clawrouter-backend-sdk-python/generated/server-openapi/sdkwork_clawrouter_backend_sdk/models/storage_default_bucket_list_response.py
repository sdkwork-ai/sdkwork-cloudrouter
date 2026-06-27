from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any

if TYPE_CHECKING:
    from .storage_default_bucket_config import StorageDefaultBucketConfig


@dataclass
class StorageDefaultBucketListResponse:
    """Storage default bucket list response schema exposed by Claw Router."""
    items: List[StorageDefaultBucketConfig]
    request_id: str
