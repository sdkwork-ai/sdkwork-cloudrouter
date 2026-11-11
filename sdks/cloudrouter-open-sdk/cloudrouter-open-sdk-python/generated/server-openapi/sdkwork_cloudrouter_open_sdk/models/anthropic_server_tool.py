from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any

if TYPE_CHECKING:
    from .anthropic_cache_control import AnthropicCacheControl


@dataclass
class AnthropicServerTool:
    """Anthropic server tool definition (bash, text editor, web search, or tool search)."""
    name: str
    type: str
    allowed_callers: Optional[List[str]] = None
    allowed_domains: Optional[List[str]] = None
    blocked_domains: Optional[List[str]] = None
    cache_control: Optional[AnthropicCacheControl] = None
    defer_loading: Optional[bool] = None
    display_height_px: Optional[int] = None
    display_number: Optional[int] = None
    display_width_px: Optional[int] = None
    max_characters: Optional[int] = None
    max_uses: Optional[int] = None
    strict: Optional[bool] = None
    user_location: Optional[Dict[str, str]] = None
