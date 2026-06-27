from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any

if TYPE_CHECKING:
    from .storage_garbage_collection_job_list_response import StorageGarbageCollectionJobListResponse


@dataclass
class OssGcJobsListResult:
    """Oss gc jobs list result schema exposed by Claw Router."""
    code: str
    data: Optional[StorageGarbageCollectionJobListResponse] = None
    msg: Optional[str] = None
