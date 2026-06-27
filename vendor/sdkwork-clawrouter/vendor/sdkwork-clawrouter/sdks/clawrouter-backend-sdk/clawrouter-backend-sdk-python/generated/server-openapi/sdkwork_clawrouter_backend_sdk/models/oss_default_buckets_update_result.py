from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any

if TYPE_CHECKING:
    from .storage_default_bucket_mutation_response import StorageDefaultBucketMutationResponse


@dataclass
class OssDefaultBucketsUpdateResult:
    """Oss default buckets update result schema exposed by Claw Router."""
    code: str
    data: Optional[StorageDefaultBucketMutationResponse] = None
    msg: Optional[str] = None
