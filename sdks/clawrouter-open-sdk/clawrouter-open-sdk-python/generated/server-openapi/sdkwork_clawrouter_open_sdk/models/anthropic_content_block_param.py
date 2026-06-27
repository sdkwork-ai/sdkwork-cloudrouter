from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any

if TYPE_CHECKING:
    from .anthropic_content_source import AnthropicContentSource


@dataclass
class AnthropicContentBlockParam:
    """Anthropic Claude anthropic content block param schema exposed by Claw Router vendor routing."""
    type: str
    content: Optional[str] = None
    id: Optional[str] = None
    input: Optional[Dict[str, str]] = None
    name: Optional[str] = None
    source: Optional[AnthropicContentSource] = None
    text: Optional[str] = None
    tool_use_id: Optional[str] = None
