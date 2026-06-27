from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any

if TYPE_CHECKING:
    from .storage_garbage_collection_job import StorageGarbageCollectionJob


@dataclass
class StorageGarbageCollectionJobListResponse:
    """Storage garbage collection job list response schema exposed by Claw Router."""
    items: List[StorageGarbageCollectionJob]
    request_id: str
    next_cursor: Optional[str] = None
