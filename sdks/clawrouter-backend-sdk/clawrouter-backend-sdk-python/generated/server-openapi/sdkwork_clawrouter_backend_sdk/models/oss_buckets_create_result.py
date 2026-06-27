from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any

if TYPE_CHECKING:
    from .storage_bucket_mutation_response import StorageBucketMutationResponse


@dataclass
class OssBucketsCreateResult:
    """Oss buckets create result schema exposed by Claw Router."""
    code: str
    data: Optional[StorageBucketMutationResponse] = None
    msg: Optional[str] = None
