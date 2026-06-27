from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any

if TYPE_CHECKING:
    from .create_completion_logprobs import CreateCompletionLogprobs


@dataclass
class CreateCompletionChoice:
    """Single choice returned by the legacy OpenAI-compatible completions API."""
    finish_reason: Optional[str] = None
    index: Optional[int] = None
    logprobs: Optional[CreateCompletionLogprobs] = None
    text: Optional[str] = None
