from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any

if TYPE_CHECKING:
    from .ark_video_tool_usage import ArkVideoToolUsage


@dataclass
class ArkImageUsage:
    """Ark image generation usage."""
    generated_images: Optional[int] = None
    input_images: Optional[int] = None
    output_tokens: Optional[int] = None
    tool_usage: Optional[ArkVideoToolUsage] = None
    total_tokens: Optional[int] = None
