from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any


@dataclass
class ChatMessageItem:
    """Chat message item schema exposed by Claw Router."""
    content: str
    conversation_id: str
    created_at: str
    direction: str
    id: str
    role: str
    status: str
    model: Optional[str] = None
    provider: Optional[str] = None
    runtime: Optional[str] = None
    runtime_invocation_id: Optional[str] = None
    turn_id: Optional[str] = None
    usage: Optional[Dict[str, Any]] = None
    usage_link_id: Optional[str] = None
