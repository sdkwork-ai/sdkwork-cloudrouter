from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any


@dataclass
class RunwayTask:
    """Runway generation task and its outputs."""
    created_at: Optional[str] = None
    failure: Optional[str] = None
    failure_code: Optional[str] = None
    id: Optional[str] = None
    output: Optional[List[str]] = None
    progress: Optional[float] = None
    status: Optional[str] = None
