from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any

if TYPE_CHECKING:
    from .storage_garbage_collection_job_mutation_response import StorageGarbageCollectionJobMutationResponse


@dataclass
class OssGcJobsCreateResult:
    """Oss gc jobs create result schema exposed by Claw Router."""
    code: str
    data: Optional[StorageGarbageCollectionJobMutationResponse] = None
    msg: Optional[str] = None
