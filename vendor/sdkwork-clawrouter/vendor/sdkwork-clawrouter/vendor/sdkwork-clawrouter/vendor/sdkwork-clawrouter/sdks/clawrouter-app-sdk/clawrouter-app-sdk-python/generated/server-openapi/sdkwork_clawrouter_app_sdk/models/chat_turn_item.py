from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any


@dataclass
class ChatTurnItem:
    """Chat turn item schema exposed by Claw Router."""
    conversation_id: str
    created_at: str
    id: str
    status: str
    updated_at: str
    agent_id: Optional[str] = None
    agent_session_id: Optional[str] = None
    model: Optional[str] = None
    provider: Optional[str] = None
