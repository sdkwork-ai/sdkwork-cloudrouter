from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any

if TYPE_CHECKING:
    from .storage_bucket_config import StorageBucketConfig


@dataclass
class StorageBucketListResponse:
    """Storage bucket list response schema exposed by Claw Router."""
    items: List[StorageBucketConfig]
    request_id: str
    next_cursor: Optional[str] = None
