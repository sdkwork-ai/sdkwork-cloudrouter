from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any


@dataclass
class ChatTurnCreateRequest:
    """Chat turn create request schema exposed by Claw Router."""
    message: str
    agent_id: Optional[str] = None
    agent_session_id: Optional[str] = None
    metadata: Optional[Dict[str, str]] = None
    mode: Optional[str] = None
    model: Optional[str] = None
    provider: Optional[str] = None
