from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any


@dataclass
class OpenAiResponseCompactRequest:
    """OpenAI-compatible request to compact response or conversation state (`POST /v1/responses/compact`)."""
    model: str
    image: Optional[Dict[str, str]] = None
    input: Optional[str] = None
    instructions: Optional[str] = None
    previous_response_id: Optional[str] = None
    prompt_cache_key: Optional[str] = None
    prompt_cache_options: Optional[Dict[str, str]] = None
    prompt_cache_retention: Optional[str] = None
    service_tier: Optional[str] = None
