from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any

if TYPE_CHECKING:
    from .cache_operation_outcome import CacheOperationOutcome


@dataclass
class CacheInstancesDeleteResult:
    """Cache instances delete result schema exposed by Claw Router."""
    code: int
    data: Any
    trace_id: str
