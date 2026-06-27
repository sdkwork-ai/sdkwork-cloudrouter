from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any

if TYPE_CHECKING:
    from .storage_garbage_collection_job import StorageGarbageCollectionJob


@dataclass
class StorageGarbageCollectionJobMutationResponse:
    """Storage garbage collection job mutation response schema exposed by Claw Router."""
    job: StorageGarbageCollectionJob
    request_id: str
