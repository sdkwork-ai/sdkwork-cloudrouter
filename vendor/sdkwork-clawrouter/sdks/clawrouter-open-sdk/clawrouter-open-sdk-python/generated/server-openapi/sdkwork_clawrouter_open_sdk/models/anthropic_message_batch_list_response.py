from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any

if TYPE_CHECKING:
    from .anthropic_message_batch import AnthropicMessageBatch


@dataclass
class AnthropicMessageBatchListResponse:
    """Anthropic Claude anthropic message batch list response schema exposed by Claw Router vendor routing."""
    data: List[AnthropicMessageBatch]
    first_id: Optional[str] = None
    has_more: Optional[bool] = None
    last_id: Optional[str] = None
