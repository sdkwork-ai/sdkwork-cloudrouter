from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any


@dataclass
class OpenAiProjectRateLimitUpdateRequest:
    """OpenAI-compatible request to update a project rate limit."""
    batch_1_day_max_input_tokens: Optional[int] = None
    max_images_per_1_minute: Optional[int] = None
    max_requests_per_1_minute: Optional[int] = None
    max_tokens_per_1_minute: Optional[int] = None
