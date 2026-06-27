from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any

if TYPE_CHECKING:
    from .anthropic_content_block import AnthropicContentBlock
    from .anthropic_usage import AnthropicUsage


@dataclass
class AnthropicMessage:
    """Anthropic Claude anthropic message schema exposed by Claw Router vendor routing."""
    content: List[AnthropicContentBlock]
    id: str
    model: str
    role: str
    stop_reason: Optional[str]
    type: str
    usage: AnthropicUsage
    stop_sequence: Optional[str] = None
