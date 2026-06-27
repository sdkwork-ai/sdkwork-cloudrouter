from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any

if TYPE_CHECKING:
    from .open_ai_chat_audio_config import OpenAiChatAudioConfig
    from .open_ai_chat_message import OpenAiChatMessage
    from .open_ai_function_call_choice import OpenAiFunctionCallChoice
    from .open_ai_function_definition import OpenAiFunctionDefinition
    from .open_ai_prediction_config import OpenAiPredictionConfig
    from .open_ai_response_format import OpenAiResponseFormat
    from .open_ai_stream_options import OpenAiStreamOptions
    from .open_ai_tool import OpenAiTool
    from .open_ai_tool_choice import OpenAiToolChoice


@dataclass
class OpenAiChatCompletionRequest:
    """OpenAI-compatible open ai chat completion request schema exposed by Claw Router."""
    messages: List[OpenAiChatMessage]
    model: str
    audio: Optional[OpenAiChatAudioConfig] = None
    frequency_penalty: Optional[float] = None
    function_call: Optional[OpenAiFunctionCallChoice] = None
    functions: Optional[List[OpenAiFunctionDefinition]] = None
    logit_bias: Optional[Dict[str, float]] = None
    logprobs: Optional[bool] = None
    max_completion_tokens: Optional[int] = None
    max_tokens: Optional[int] = None
    metadata: Optional[Dict[str, str]] = None
    modalities: Optional[List[str]] = None
    n: Optional[int] = None
    parallel_tool_calls: Optional[bool] = None
    prediction: Optional[OpenAiPredictionConfig] = None
    presence_penalty: Optional[float] = None
    reasoning_effort: Optional[str] = None
    response_format: Optional[OpenAiResponseFormat] = None
    seed: Optional[int] = None
    service_tier: Optional[str] = None
    stop: Optional[str] = None
    store: Optional[bool] = None
    stream: Optional[bool] = None
    stream_options: Optional[OpenAiStreamOptions] = None
    temperature: Optional[float] = None
    tool_choice: Optional[OpenAiToolChoice] = None
    tools: Optional[List[OpenAiTool]] = None
    top_logprobs: Optional[int] = None
    top_p: Optional[float] = None
    user: Optional[str] = None
