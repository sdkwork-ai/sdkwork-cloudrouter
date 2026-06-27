from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any

if TYPE_CHECKING:
    from .runtime_event_item import RuntimeEventItem


@dataclass
class RuntimeEventListResponse:
    """Runtime event list response schema exposed by Claw Router."""
    items: List[RuntimeEventItem]
