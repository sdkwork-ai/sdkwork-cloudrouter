from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any

if TYPE_CHECKING:
    from .open_ai_thread_message_create_request import OpenAiThreadMessageCreateRequest


@dataclass
class OpenAiThreadCreateRequest:
    """OpenAI-compatible request to create a thread."""
    messages: Optional[List[OpenAiThreadMessageCreateRequest]] = None
    metadata: Optional[Dict[str, str]] = None
    tool_resources: Optional[str] = None
