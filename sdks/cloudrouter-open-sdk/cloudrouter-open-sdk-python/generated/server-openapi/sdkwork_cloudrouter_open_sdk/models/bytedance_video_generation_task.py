from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any

if TYPE_CHECKING:
    from .ark_video_task_content import ArkVideoTaskContent
    from .ark_video_usage import ArkVideoUsage
    from .ark_web_search_tool import ArkWebSearchTool
    from .provider_task_error import ProviderTaskError


@dataclass
class BytedanceVideoGenerationTask:
    """ByteDance Ark content generation task and its generated video."""
    content: Optional[ArkVideoTaskContent] = None
    created_at: Optional[int] = None
    draft: Optional[bool] = None
    duration: Optional[int] = None
    error: Optional[ProviderTaskError] = None
    execution_expires_after: Optional[int] = None
    frames: Optional[int] = None
    framespersecond: Optional[int] = None
    generate_audio: Optional[bool] = None
    id: Optional[str] = None
    model: Optional[str] = None
    output_format: Optional[str] = None
    priority: Optional[int] = None
    ratio: Optional[str] = None
    resolution: Optional[str] = None
    safety_identifier: Optional[str] = None
    seed: Optional[int] = None
    service_tier: Optional[str] = None
    status: Optional[str] = None
    tools: Optional[List[ArkWebSearchTool]] = None
    updated_at: Optional[int] = None
    usage: Optional[ArkVideoUsage] = None
