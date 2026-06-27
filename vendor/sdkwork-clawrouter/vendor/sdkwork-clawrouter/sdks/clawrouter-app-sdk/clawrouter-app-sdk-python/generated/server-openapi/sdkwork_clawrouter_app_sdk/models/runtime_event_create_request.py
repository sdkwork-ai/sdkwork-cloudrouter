from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any


@dataclass
class RuntimeEventCreateRequest:
    """Runtime event create request schema exposed by Claw Router."""
    event_type: str
    event_source: Optional[str] = None
    metadata: Optional[Dict[str, str]] = None
    payload_json: Optional[Dict[str, str]] = None
    text_delta: Optional[str] = None
