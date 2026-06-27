from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any

if TYPE_CHECKING:
    from .open_ai_conversation_reference import OpenAiConversationReference
    from .open_ai_prompt_reference import OpenAiPromptReference
    from .open_ai_reasoning_config import OpenAiReasoningConfig
    from .open_ai_response_input_item import OpenAiResponseInputItem
    from .open_ai_text_config import OpenAiTextConfig
    from .open_ai_tool import OpenAiTool
    from .open_ai_tool_choice import OpenAiToolChoice


@dataclass
class OpenAiResponsesRequest:
    """OpenAI-compatible open ai responses request schema exposed by Claw Router."""
    input: str
    model: str
    background: Optional[bool] = None
    conversation: Optional[str] = None
    include: Optional[List[str]] = None
    instructions: Optional[str] = None
    max_output_tokens: Optional[int] = None
    max_tool_calls: Optional[int] = None
    metadata: Optional[Dict[str, str]] = None
    parallel_tool_calls: Optional[bool] = None
    previous_response_id: Optional[str] = None
    prompt: Optional[OpenAiPromptReference] = None
    prompt_cache_key: Optional[str] = None
    reasoning: Optional[OpenAiReasoningConfig] = None
    service_tier: Optional[str] = None
    store: Optional[bool] = None
    stream: Optional[bool] = None
    temperature: Optional[float] = None
    text: Optional[OpenAiTextConfig] = None
    tool_choice: Optional[OpenAiToolChoice] = None
    tools: Optional[List[OpenAiTool]] = None
    top_logprobs: Optional[int] = None
    top_p: Optional[float] = None
    truncation: Optional[str] = None
    user: Optional[str] = None
