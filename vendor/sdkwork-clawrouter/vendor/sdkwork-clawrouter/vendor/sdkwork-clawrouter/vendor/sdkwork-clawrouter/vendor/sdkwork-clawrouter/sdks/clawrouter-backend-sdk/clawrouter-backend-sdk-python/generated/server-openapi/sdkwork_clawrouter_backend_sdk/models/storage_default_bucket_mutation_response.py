from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any

if TYPE_CHECKING:
    from .storage_default_bucket_config import StorageDefaultBucketConfig


@dataclass
class StorageDefaultBucketMutationResponse:
    """Storage default bucket mutation response schema exposed by Claw Router."""
    default_bucket: StorageDefaultBucketConfig
    request_id: str
