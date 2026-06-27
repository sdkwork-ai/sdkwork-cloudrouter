from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any

if TYPE_CHECKING:
    from .anthropic_content_block_param import AnthropicContentBlockParam


@dataclass
class AnthropicMessageParam:
    """Anthropic Claude anthropic message param schema exposed by Claw Router vendor routing."""
    content: str
    role: str
