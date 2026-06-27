from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any


@dataclass
class CreateStorageGarbageCollectionJobRequest:
    """Create storage garbage collection job request schema exposed by Claw Router."""
    dry_run: bool
    job_type: str
    criteria: Optional[Dict[str, str]] = None
    dry_run_sample: Optional[str] = None
    retention_window: Optional[str] = None
    target: Optional[str] = None
