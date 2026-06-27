from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any

if TYPE_CHECKING:
    from .google_schema import GoogleSchema
    from .google_thinking_config import GoogleThinkingConfig


@dataclass
class GoogleGenerationConfig:
    """Google Gemini google generation config schema exposed by Claw Router vendor routing."""
    candidate_count: Optional[int] = None
    max_output_tokens: Optional[int] = None
    response_mime_type: Optional[str] = None
    response_schema: Optional[GoogleSchema] = None
    stop_sequences: Optional[List[str]] = None
    temperature: Optional[float] = None
    thinking_config: Optional[GoogleThinkingConfig] = None
    top_k: Optional[int] = None
    top_p: Optional[float] = None
