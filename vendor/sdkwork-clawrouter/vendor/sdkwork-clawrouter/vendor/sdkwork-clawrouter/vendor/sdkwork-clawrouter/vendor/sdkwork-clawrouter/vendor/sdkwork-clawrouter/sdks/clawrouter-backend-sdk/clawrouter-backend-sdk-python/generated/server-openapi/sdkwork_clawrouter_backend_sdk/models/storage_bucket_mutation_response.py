from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any

if TYPE_CHECKING:
    from .storage_bucket_config import StorageBucketConfig


@dataclass
class StorageBucketMutationResponse:
    """Storage bucket mutation response schema exposed by Claw Router."""
    bucket: StorageBucketConfig
    request_id: str
