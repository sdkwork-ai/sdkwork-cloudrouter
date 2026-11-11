from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any

if TYPE_CHECKING:
    from .anthropic_cache_control import AnthropicCacheControl
    from .provider_json_schema import ProviderJsonSchema


@dataclass
class AnthropicTool:
    """Anthropic custom client tool definition (the `Tool` member of `ToolUnion`)."""
    input_schema: ProviderJsonSchema
    name: str
    allowed_callers: Optional[List[str]] = None
    cache_control: Optional[AnthropicCacheControl] = None
    defer_loading: Optional[bool] = None
    description: Optional[str] = None
    eager_input_streaming: Optional[bool] = None
    input_examples: Optional[List[Dict[str, str]]] = None
    strict: Optional[bool] = None
    type: Optional[str] = None
