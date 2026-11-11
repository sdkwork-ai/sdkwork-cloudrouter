from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any

if TYPE_CHECKING:
    from .open_ai_image_reference_input import OpenAiImageReferenceInput


@dataclass
class OpenAiImageEditRequest:
    """OpenAI-compatible image edit request (JSON form, `POST /v1/images/edits`)."""
    images: List[OpenAiImageReferenceInput]
    prompt: str
    background: Optional[str] = None
    complexity: Optional[str] = None
    frame_count: Optional[int] = None
    frame_duration_ms: Optional[int] = None
    input_fidelity: Optional[str] = None
    markup: Optional[Dict[str, str]] = None
    mask: Optional[Dict[str, str]] = None
    model: Optional[str] = None
    moderation: Optional[str] = None
    n: Optional[int] = None
    output_compression: Optional[int] = None
    output_format: Optional[str] = None
    partial_images: Optional[int] = None
    quality: Optional[str] = None
    safety_identifier: Optional[str] = None
    size: Optional[str] = None
    stream: Optional[bool] = None
    svg: Optional[Dict[str, str]] = None
    user: Optional[str] = None
