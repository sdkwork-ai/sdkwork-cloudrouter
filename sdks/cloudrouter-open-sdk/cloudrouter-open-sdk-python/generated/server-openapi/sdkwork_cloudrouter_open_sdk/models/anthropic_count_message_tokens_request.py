from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any

if TYPE_CHECKING:
    from .anthropic_cache_control import AnthropicCacheControl
    from .anthropic_content_block_param import AnthropicContentBlockParam
    from .anthropic_message_param import AnthropicMessageParam
    from .anthropic_output_config import AnthropicOutputConfig
    from .anthropic_server_tool import AnthropicServerTool
    from .anthropic_thinking_config import AnthropicThinkingConfig
    from .anthropic_tool import AnthropicTool
    from .anthropic_tool_choice import AnthropicToolChoice


@dataclass
class AnthropicCountMessageTokensRequest:
    """Anthropic token-counting request (`POST /v1/messages/count_tokens`). The vendor accepts the conversation, system prompt, tools, and thinking configuration, but not the generation controls."""
    messages: List[AnthropicMessageParam]
    model: str
    cache_control: Optional[AnthropicCacheControl] = None
    output_config: Optional[AnthropicOutputConfig] = None
    speed: Optional[str] = None
    system: Optional[str] = None
    thinking: Optional[AnthropicThinkingConfig] = None
    tool_choice: Optional[AnthropicToolChoice] = None
    tools: Optional[List[AnthropicTool]] = None
