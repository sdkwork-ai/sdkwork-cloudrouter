from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any


@dataclass
class OpenAiRealtimeSessionCreateRequest:
    """OpenAI-compatible request to create a realtime session (`POST /v1/realtime/sessions`)."""
    client_secret: Dict[str, str]
    input_audio_format: Optional[str] = None
    input_audio_transcription: Optional[Dict[str, str]] = None
    instructions: Optional[str] = None
    max_response_output_tokens: Optional[int] = None
    modalities: Optional[List[str]] = None
    output_audio_format: Optional[str] = None
    prompt: Optional[Dict[str, str]] = None
    speed: Optional[float] = None
    temperature: Optional[float] = None
    tool_choice: Optional[str] = None
    tools: Optional[List[Dict[str, str]]] = None
    tracing: Optional[Dict[str, str]] = None
    truncation: Optional[Dict[str, str]] = None
    turn_detection: Optional[Dict[str, str]] = None
    voice: Optional[str] = None
