from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any

if TYPE_CHECKING:
    from .ark_web_search_tool import ArkWebSearchTool


@dataclass
class BytedanceImageGenerationRequest:
    """ByteDance Ark Seedream image generation request; the vendor serves the official `/api/v3/images/generations` contract."""
    model: str
    background: Optional[str] = None
    image: Optional[str] = None
    layer_decomposition: Optional[bool] = None
    optimize_prompt_options: Optional[Dict[str, str]] = None
    output_format: Optional[str] = None
    prompt: Optional[str] = None
    response_format: Optional[str] = None
    sequential_image_generation: Optional[str] = None
    sequential_image_generation_options: Optional[Dict[str, str]] = None
    size: Optional[str] = None
    stream: Optional[bool] = None
    tools: Optional[List[ArkWebSearchTool]] = None
    watermark: Optional[bool] = None
