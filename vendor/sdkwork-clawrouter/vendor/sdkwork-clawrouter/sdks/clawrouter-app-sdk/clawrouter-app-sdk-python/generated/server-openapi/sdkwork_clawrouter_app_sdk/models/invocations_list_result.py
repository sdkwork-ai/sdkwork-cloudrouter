from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any

if TYPE_CHECKING:
    from .runtime_invocation_list_response import RuntimeInvocationListResponse


@dataclass
class InvocationsListResult:
    """Invocations list result schema exposed by Claw Router."""
    code: str
    data: Optional[RuntimeInvocationListResponse] = None
    msg: Optional[str] = None
