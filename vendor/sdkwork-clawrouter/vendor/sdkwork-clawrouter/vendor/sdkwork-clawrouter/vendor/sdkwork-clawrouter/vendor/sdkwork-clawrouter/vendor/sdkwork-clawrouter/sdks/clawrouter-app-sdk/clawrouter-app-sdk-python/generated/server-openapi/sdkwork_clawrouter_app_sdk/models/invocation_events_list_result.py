from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any

if TYPE_CHECKING:
    from .runtime_event_list_response import RuntimeEventListResponse


@dataclass
class InvocationEventsListResult:
    """Invocation events list result schema exposed by Claw Router."""
    code: str
    data: Optional[RuntimeEventListResponse] = None
    msg: Optional[str] = None
