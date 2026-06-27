from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any

if TYPE_CHECKING:
    from .google_cached_content_usage_metadata import GoogleCachedContentUsageMetadata
    from .google_content import GoogleContent
    from .google_tool import GoogleTool
    from .google_tool_config import GoogleToolConfig


@dataclass
class GoogleCachedContent:
    """Google Gemini google cached content schema exposed by Claw Router vendor routing."""
    contents: Optional[List[GoogleContent]] = None
    create_time: Optional[str] = None
    display_name: Optional[str] = None
    expire_time: Optional[str] = None
    model: Optional[str] = None
    name: Optional[str] = None
    system_instruction: Optional[GoogleContent] = None
    tool_config: Optional[GoogleToolConfig] = None
    tools: Optional[List[GoogleTool]] = None
    update_time: Optional[str] = None
    usage_metadata: Optional[GoogleCachedContentUsageMetadata] = None
