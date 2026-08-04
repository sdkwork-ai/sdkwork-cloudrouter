from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any

if TYPE_CHECKING:
    from .open_ai_token_usage import OpenAiTokenUsage


@dataclass
class OpenAiRunStep:
    """OpenAI-compatible run step object."""
    assistant_id: str
    created_at: int
    id: str
    object: str
    run_id: str
    status: str
    thread_id: str
    type: str
    cancelled_at: Optional[int] = None
    completed_at: Optional[int] = None
    expired_at: Optional[int] = None
    failed_at: Optional[int] = None
    last_error: Optional[str] = None
    metadata: Optional[Dict[str, str]] = None
    step_details: Optional[str] = None
    usage: Optional[OpenAiTokenUsage] = None
