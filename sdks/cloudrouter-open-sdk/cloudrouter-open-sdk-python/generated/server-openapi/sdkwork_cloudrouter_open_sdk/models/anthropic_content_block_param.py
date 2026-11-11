from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any

if TYPE_CHECKING:
    from .anthropic_cache_control import AnthropicCacheControl
    from .anthropic_content_source import AnthropicContentSource


@dataclass
class AnthropicContentBlockParam:
    """Anthropic content block (union member of `ContentBlockParam`)."""
    type: str
    cache_control: Optional[AnthropicCacheControl] = None
    caller: Optional[Dict[str, str]] = None
    citations: Optional[List[Dict[str, str]]] = None
    content: Optional[str] = None
    context: Optional[str] = None
    data: Optional[str] = None
    id: Optional[str] = None
    input: Optional[Dict[str, str]] = None
    is_error: Optional[bool] = None
    name: Optional[str] = None
    signature: Optional[str] = None
    source: Optional[AnthropicContentSource] = None
    text: Optional[str] = None
    thinking: Optional[str] = None
    title: Optional[str] = None
    tool_use_id: Optional[str] = None
    toolset_name: Optional[str] = None
