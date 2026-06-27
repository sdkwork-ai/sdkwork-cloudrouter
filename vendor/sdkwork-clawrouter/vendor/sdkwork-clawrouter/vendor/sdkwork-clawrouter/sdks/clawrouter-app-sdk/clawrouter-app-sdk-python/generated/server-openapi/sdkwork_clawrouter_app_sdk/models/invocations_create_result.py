from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any

if TYPE_CHECKING:
    from .runtime_invocation_response import RuntimeInvocationResponse


@dataclass
class InvocationsCreateResult:
    """Invocations create result schema exposed by Claw Router."""
    code: str
    data: Optional[RuntimeInvocationResponse] = None
    msg: Optional[str] = None
