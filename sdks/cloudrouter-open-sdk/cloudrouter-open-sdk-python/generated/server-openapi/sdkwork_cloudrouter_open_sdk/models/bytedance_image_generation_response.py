from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any

if TYPE_CHECKING:
    from .ark_image_generation_data import ArkImageGenerationData
    from .ark_image_usage import ArkImageUsage
    from .ark_web_search_tool import ArkWebSearchTool
    from .provider_task_error import ProviderTaskError


@dataclass
class BytedanceImageGenerationResponse:
    """ByteDance Ark image generation response."""
    created: Optional[int] = None
    data: Optional[List[ArkImageGenerationData]] = None
    error: Optional[ProviderTaskError] = None
    model: Optional[str] = None
    tools: Optional[List[ArkWebSearchTool]] = None
    usage: Optional[ArkImageUsage] = None
