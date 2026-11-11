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
    max_completion_tokens: Optional[int] = None
    max_prompt_tokens: Optional[int] = None
    metadata: Optional[Dict[str, str]] = None
    model: Optional[str] = None
    parallel_tool_calls: Optional[bool] = None
    response_format: Optional[str] = None
    stream: Optional[bool] = None
    temperature: Optional[float] = None
    thread: Optional[OpenAiThreadCreateRequest] = None
    tool_choice: Optional[str] = None
    tool_resources: Optional[str] = None
    tools: Optional[List[str]] = None
    top_p: Optional[float] = None
    truncation_strategy: Optional[str] = None
