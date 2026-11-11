from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any


@dataclass
class OpenAiRealtimeCallActionRequest:
    """OpenAI-compatible request to accept an inbound realtime call (`POST /v1/realtime/calls/{call_id}/accept`)."""
    type: str
    audio: Optional[Dict[str, str]] = None
    include: Optional[List[str]] = None
    instructions: Optional[str] = None
    max_output_tokens: Optional[int] = None
    model: Optional[str] = None
    output_modalities: Optional[List[str]] = None
    parallel_tool_calls: Optional[bool] = None
    prompt: Optional[Dict[str, str]] = None
    reasoning: Optional[Dict[str, str]] = None
    tool_choice: Optional[str] = None
    tools: Optional[List[Dict[str, str]]] = None
    tracing: Optional[Dict[str, str]] = None
    truncation: Optional[Dict[str, str]] = None
