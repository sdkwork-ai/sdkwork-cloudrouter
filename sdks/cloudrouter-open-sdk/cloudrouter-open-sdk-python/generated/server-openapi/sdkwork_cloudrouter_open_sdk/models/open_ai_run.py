from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any

if TYPE_CHECKING:
    from .open_ai_token_usage import OpenAiTokenUsage


@dataclass
class OpenAiRun:
    """OpenAI-compatible thread run object."""
    assistant_id: str
    created_at: int
    id: str
    object: str
    status: str
    thread_id: str
    cancelled_at: Optional[int] = None
    completed_at: Optional[int] = None
    expires_at: Optional[int] = None
    failed_at: Optional[int] = None
    instructions: Optional[str] = None
    last_error: Optional[str] = None
    metadata: Optional[Dict[str, str]] = None
    model: Optional[str] = None
    required_action: Optional[str] = None
    started_at: Optional[int] = None
    tools: Optional[List[str]] = None
    usage: Optional[OpenAiTokenUsage] = None
