from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any

if TYPE_CHECKING:
    from .runtime_invocation_item import RuntimeInvocationItem


@dataclass
class RuntimeInvocationResponse:
    """Runtime invocation response schema exposed by Claw Router."""
    item: RuntimeInvocationItem
