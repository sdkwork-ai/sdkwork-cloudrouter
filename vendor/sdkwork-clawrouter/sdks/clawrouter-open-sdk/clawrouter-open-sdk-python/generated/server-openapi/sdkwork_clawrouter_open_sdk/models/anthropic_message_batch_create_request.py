from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any

if TYPE_CHECKING:
    from .anthropic_message_batch_request import AnthropicMessageBatchRequest


@dataclass
class AnthropicMessageBatchCreateRequest:
    """Anthropic Claude anthropic message batch create request schema exposed by Claw Router vendor routing."""
    requests: List[AnthropicMessageBatchRequest]
