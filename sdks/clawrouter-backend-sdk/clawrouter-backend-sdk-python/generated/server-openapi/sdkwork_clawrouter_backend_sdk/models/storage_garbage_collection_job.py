from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any


@dataclass
class StorageGarbageCollectionJob:
    """Storage garbage collection job schema exposed by Claw Router."""
    id: str
    job_id: str
    status: str
    candidate_count: Optional[str] = None
    created_at: Optional[str] = None
    dry_run: Optional[bool] = None
    job_type: Optional[str] = None
    retention: Optional[str] = None
    target: Optional[str] = None
