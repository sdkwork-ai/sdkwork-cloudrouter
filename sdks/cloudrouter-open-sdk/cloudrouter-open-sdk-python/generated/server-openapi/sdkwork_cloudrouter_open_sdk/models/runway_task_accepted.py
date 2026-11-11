from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any


@dataclass
class RunwayTaskAccepted:
    """Runway task submission acknowledgement; poll the task through GET /runway/v1/tasks/{task_id}."""
    id: str
    estimated_cost: Optional[Dict[str, str]] = None
