from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any

if TYPE_CHECKING:
    from .runtime_invocation_item import RuntimeInvocationItem


@dataclass
class RuntimeInvocationListResponse:
    """Runtime invocation list response schema exposed by Claw Router."""
    items: List[RuntimeInvocationItem]
