from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any


@dataclass
class CacheOperationOutcome:
    """Cache operation outcome schema exposed by Claw Router."""
    cache_key: Optional[str]
    deleted_entries: str
    instance_name: Optional[str]
    namespace: Optional[str]
    operation: str
    refreshed_entries: str
    status: str
