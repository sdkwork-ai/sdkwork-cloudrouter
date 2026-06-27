from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any


@dataclass
class ChatConversationCreateRequest:
    """Chat conversation create request schema exposed by Claw Router."""
    agent_id: Optional[str] = None
    agent_session_id: Optional[str] = None
    default_model: Optional[str] = None
    default_provider: Optional[str] = None
    memory_space_id: Optional[str] = None
    metadata: Optional[Dict[str, str]] = None
    source_surface: Optional[str] = None
    title: Optional[str] = None
