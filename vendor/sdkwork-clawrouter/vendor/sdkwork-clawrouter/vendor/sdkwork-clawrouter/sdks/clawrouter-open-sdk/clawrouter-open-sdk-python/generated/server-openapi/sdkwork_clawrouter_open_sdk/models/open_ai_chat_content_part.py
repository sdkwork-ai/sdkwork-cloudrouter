from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any

if TYPE_CHECKING:
    from .open_ai_chat_file import OpenAiChatFile
    from .open_ai_chat_image_url import OpenAiChatImageUrl
    from .open_ai_chat_input_audio import OpenAiChatInputAudio


@dataclass
class OpenAiChatContentPart:
    """OpenAI-compatible open ai chat content part schema exposed by Claw Router."""
    type: str
    file: Optional[OpenAiChatFile] = None
    image_url: Optional[OpenAiChatImageUrl] = None
    input_audio: Optional[OpenAiChatInputAudio] = None
    text: Optional[str] = None
