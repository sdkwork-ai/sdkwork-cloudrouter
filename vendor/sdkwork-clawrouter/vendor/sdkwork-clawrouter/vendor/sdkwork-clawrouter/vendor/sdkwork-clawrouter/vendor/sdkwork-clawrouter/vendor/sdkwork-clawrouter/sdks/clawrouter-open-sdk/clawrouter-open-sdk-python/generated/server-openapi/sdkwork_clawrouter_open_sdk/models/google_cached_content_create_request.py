from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any

if TYPE_CHECKING:
    from .google_content import GoogleContent
    from .google_tool import GoogleTool
    from .google_tool_config import GoogleToolConfig


@dataclass
class GoogleCachedContentCreateRequest:
    """Google Gemini google cached content create request schema exposed by Claw Router vendor routing."""
    contents: Optional[List[GoogleContent]] = None
    display_name: Optional[str] = None
    expire_time: Optional[str] = None
    model: Optional[str] = None
    system_instruction: Optional[GoogleContent] = None
    tool_config: Optional[GoogleToolConfig] = None
    tools: Optional[List[GoogleTool]] = None
    ttl: Optional[str] = None
