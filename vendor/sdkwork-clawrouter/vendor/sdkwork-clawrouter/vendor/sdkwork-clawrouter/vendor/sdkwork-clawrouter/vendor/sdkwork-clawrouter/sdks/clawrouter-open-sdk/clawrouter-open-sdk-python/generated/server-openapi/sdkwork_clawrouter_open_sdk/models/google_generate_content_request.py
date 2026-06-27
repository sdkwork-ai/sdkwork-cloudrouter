from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any

if TYPE_CHECKING:
    from .google_content import GoogleContent
    from .google_generation_config import GoogleGenerationConfig
    from .google_safety_setting import GoogleSafetySetting
    from .google_tool import GoogleTool
    from .google_tool_config import GoogleToolConfig


@dataclass
class GoogleGenerateContentRequest:
    """Google Gemini google generate content request schema exposed by Claw Router vendor routing."""
    contents: List[GoogleContent]
    cached_content: Optional[str] = None
    generation_config: Optional[GoogleGenerationConfig] = None
    safety_settings: Optional[List[GoogleSafetySetting]] = None
    system_instruction: Optional[GoogleContent] = None
    tool_config: Optional[GoogleToolConfig] = None
    tools: Optional[List[GoogleTool]] = None
