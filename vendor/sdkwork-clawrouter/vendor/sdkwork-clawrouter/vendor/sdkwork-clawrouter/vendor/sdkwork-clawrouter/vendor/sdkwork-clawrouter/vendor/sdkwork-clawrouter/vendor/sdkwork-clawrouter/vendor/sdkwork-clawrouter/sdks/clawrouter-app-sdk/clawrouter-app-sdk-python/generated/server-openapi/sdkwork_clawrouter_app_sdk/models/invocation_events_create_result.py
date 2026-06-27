from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any

if TYPE_CHECKING:
    from .runtime_event_response import RuntimeEventResponse


@dataclass
class InvocationEventsCreateResult:
    """Invocation events create result schema exposed by Claw Router."""
    code: str
    data: Optional[RuntimeEventResponse] = None
    msg: Optional[str] = None
