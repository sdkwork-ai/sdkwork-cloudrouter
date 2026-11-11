from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any

if TYPE_CHECKING:
    from .ark_content_part import ArkContentPart
    from .ark_web_search_tool import ArkWebSearchTool


@dataclass
class BytedanceVideoGenerationRequest:
    """ByteDance Ark Seedance video generation task request; the vendor serves the official `/api/v3/contents/generations/tasks` contract."""
    content: List[ArkContentPart]
    model: str
    callback_url: Optional[str] = None
    camera_fixed: Optional[bool] = None
    draft: Optional[bool] = None
    duration: Optional[int] = None
    execution_expires_after: Optional[int] = None
    frames: Optional[int] = None
    generate_audio: Optional[bool] = None
    omni_reference_task_type: Optional[str] = None
    output_format: Optional[str] = None
    priority: Optional[int] = None
    ratio: Optional[str] = None
    resolution: Optional[str] = None
    return_last_frame: Optional[bool] = None
    safety_identifier: Optional[str] = None
    seed: Optional[int] = None
    service_tier: Optional[str] = None
    tools: Optional[List[ArkWebSearchTool]] = None
    watermark: Optional[bool] = None
