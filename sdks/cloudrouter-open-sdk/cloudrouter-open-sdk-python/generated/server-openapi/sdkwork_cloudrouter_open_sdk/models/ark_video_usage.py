from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any

if TYPE_CHECKING:
    from .ark_video_tool_usage import ArkVideoToolUsage


@dataclass
class ArkVideoUsage:
    """Ark video generation token usage."""
    completion_tokens: Optional[int] = None
    tool_usage: Optional[ArkVideoToolUsage] = None
    total_tokens: Optional[int] = None
