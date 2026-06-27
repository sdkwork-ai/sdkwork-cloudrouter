from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any

if TYPE_CHECKING:
    from .runtime_event_item import RuntimeEventItem


@dataclass
class RuntimeEventResponse:
    """Runtime event response schema exposed by Claw Router."""
    item: RuntimeEventItem
