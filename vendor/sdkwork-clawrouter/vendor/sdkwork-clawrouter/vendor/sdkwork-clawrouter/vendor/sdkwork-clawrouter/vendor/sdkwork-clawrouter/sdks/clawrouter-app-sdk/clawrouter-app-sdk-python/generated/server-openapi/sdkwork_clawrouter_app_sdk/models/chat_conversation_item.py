from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any


@dataclass
class ChatConversationItem:
    """Chat conversation item schema exposed by Claw Router."""
    created_at: str
    id: str
    message_count: str
    source_surface: str
    status: str
    title: str
    turn_count: str
    updated_at: str
    agent_id: Optional[str] = None
    agent_session_id: Optional[str] = None
    default_model: Optional[str] = None
    default_provider: Optional[str] = None
    last_message_preview: Optional[str] = None
    memory_space_id: Optional[str] = None
