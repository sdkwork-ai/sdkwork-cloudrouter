from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any


@dataclass
class RuntimeEventItem:
    """Runtime event item schema exposed by Claw Router."""
    created_at: str
    event_no: str
    event_source: str
    event_type: str
    id: str
    invocation_id: str
    payload_json: Dict[str, str]
    text_delta: Optional[str] = None
