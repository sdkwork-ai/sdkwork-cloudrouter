from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any


@dataclass
class MessagingSuppressionCreateRequest:
    """Messaging suppression create request schema exposed by Claw Router."""
    channel: str
    reason_code: str
    starts_at: str
    target_hash: str
    target_masked: str
    ends_at: Optional[str] = None
    note: Optional[str] = None
    scope_id: Optional[str] = None
    scope_type: Optional[str] = None
    source: Optional[str] = None
