from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any


@dataclass
class ListFineTuningCheckpointPermissionsItem:
    """Item module returned inside the listFineTuningCheckpointPermissions list response."""
    created: Optional[int] = None
    created_at: Optional[int] = None
    fine_tuned_model: Optional[str] = None
    id: Optional[str] = None
    metadata: Optional[Dict[str, str]] = None
    model: Optional[str] = None
    object: Optional[str] = None
    result_files: Optional[List[str]] = None
    status: Optional[str] = None
    training_file: Optional[str] = None
