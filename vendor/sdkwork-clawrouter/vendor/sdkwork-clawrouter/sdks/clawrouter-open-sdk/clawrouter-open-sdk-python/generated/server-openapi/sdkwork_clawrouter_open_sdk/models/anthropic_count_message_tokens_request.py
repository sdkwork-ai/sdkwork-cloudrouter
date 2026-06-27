from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any

if TYPE_CHECKING:
    from .anthropic_content_block_param import AnthropicContentBlockParam
    from .anthropic_message_param import AnthropicMessageParam
    from .anthropic_thinking_config import AnthropicThinkingConfig
    from .anthropic_tool import AnthropicTool
    from .anthropic_tool_choice import AnthropicToolChoice


@dataclass
class AnthropicCountMessageTokensRequest:
    """Anthropic Claude anthropic count message tokens request schema exposed by Claw Router vendor routing."""
    messages: List[AnthropicMessageParam]
    model: str
    max_tokens: Optional[int] = None
    metadata: Optional[Dict[str, str]] = None
    stop_sequences: Optional[List[str]] = None
    stream: Optional[bool] = None
    system: Optional[str] = None
    temperature: Optional[float] = None
    thinking: Optional[AnthropicThinkingConfig] = None
    tool_choice: Optional[AnthropicToolChoice] = None
    tools: Optional[List[AnthropicTool]] = None
    top_k: Optional[int] = None
    top_p: Optional[float] = None
