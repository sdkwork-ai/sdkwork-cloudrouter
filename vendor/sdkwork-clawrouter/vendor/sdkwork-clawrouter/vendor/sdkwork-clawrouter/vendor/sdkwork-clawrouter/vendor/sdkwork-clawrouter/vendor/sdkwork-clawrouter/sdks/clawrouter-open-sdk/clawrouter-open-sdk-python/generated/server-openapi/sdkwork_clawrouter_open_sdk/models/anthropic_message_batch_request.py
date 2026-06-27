from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any

if TYPE_CHECKING:
    from .anthropic_message_create_request import AnthropicMessageCreateRequest


@dataclass
class AnthropicMessageBatchRequest:
    """Anthropic Claude anthropic message batch request schema exposed by Claw Router vendor routing."""
    custom_id: str
    params: AnthropicMessageCreateRequest
