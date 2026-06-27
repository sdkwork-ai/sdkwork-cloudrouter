from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any


@dataclass
class OpenAiOrganizationUsageBucket:
    """OpenAI-compatible organization usage bucket."""
    end_time: Optional[int] = None
    input_tokens: Optional[int] = None
    num_requests: Optional[int] = None
    object: Optional[str] = None
    output_tokens: Optional[int] = None
    results: Optional[List[str]] = None
    start_time: Optional[int] = None
