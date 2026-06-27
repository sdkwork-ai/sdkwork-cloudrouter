from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any

if TYPE_CHECKING:
    from .open_ai_thread_create_request import OpenAiThreadCreateRequest


@dataclass
class OpenAiThreadAndRunCreateRequest:
    """OpenAI-compatible request to create a thread and start a run."""
    assistant_id: str
    instructions: Optional[str] = None
    metadata: Optional[Dict[str, str]] = None
    model: Optional[str] = None
    stream: Optional[bool] = None
    thread: Optional[OpenAiThreadCreateRequest] = None
    tools: Optional[List[str]] = None
