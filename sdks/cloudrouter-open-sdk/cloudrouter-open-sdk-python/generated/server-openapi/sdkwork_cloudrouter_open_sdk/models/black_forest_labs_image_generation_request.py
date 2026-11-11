from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any


@dataclass
class BlackForestLabsImageGenerationRequest:
    """Black Forest Labs FLUX image generation request (union of the vendor's per-model `/v1/flux-*` request variants)."""
    prompt: str
    aspect_ratio: Optional[str] = None
    auto_crop: Optional[bool] = None
    bottom: Optional[int] = None
    dilate_pixels: Optional[int] = None
    disable_pup: Optional[bool] = None
    finetune_id: Optional[str] = None
    finetune_strength: Optional[float] = None
    garment: Optional[str] = None
    grounding: Optional[bool] = None
    guidance: Optional[float] = None
    height: Optional[int] = None
    image: Optional[str] = None
    image_prompt: Optional[str] = None
    image_prompt_strength: Optional[float] = None
    images: Optional[str] = None
    input_image: Optional[str] = None
    input_image_2: Optional[str] = None
    input_image_3: Optional[str] = None
    input_image_4: Optional[str] = None
    input_image_5: Optional[str] = None
    input_image_6: Optional[str] = None
    input_image_7: Optional[str] = None
    input_image_8: Optional[str] = None
    input_image_blob_path: Optional[str] = None
    left: Optional[int] = None
    mask: Optional[str] = None
    mode: Optional[str] = None
    output_format: Optional[str] = None
    person: Optional[str] = None
    prompt_upsampling: Optional[bool] = None
    raw: Optional[bool] = None
    reference_offset_x: Optional[int] = None
    reference_offset_y: Optional[int] = None
    resolution: Optional[str] = None
    right: Optional[int] = None
    safety_tolerance: Optional[int] = None
    seed: Optional[int] = None
    steps: Optional[int] = None
    top: Optional[int] = None
    user: Optional[str] = None
    version: Optional[str] = None
    webhook_secret: Optional[str] = None
    webhook_url: Optional[str] = None
    width: Optional[int] = None
