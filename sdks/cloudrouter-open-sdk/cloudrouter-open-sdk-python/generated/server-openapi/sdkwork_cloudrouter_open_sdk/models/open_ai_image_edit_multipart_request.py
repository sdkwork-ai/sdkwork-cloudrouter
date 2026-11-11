from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any


@dataclass
class OpenAiImageEditMultipartRequest:
    """OpenAI-compatible image edit request (multipart form)."""
    image: bytes
    model: str
    prompt: str
    background: Optional[str] = None
    complexity: Optional[str] = None
    frame_count: Optional[int] = None
    frame_duration_ms: Optional[int] = None
    input_fidelity: Optional[str] = None
    markup: Optional[str] = None
    mask: Optional[bytes] = None
    moderation: Optional[str] = None
    n: Optional[int] = None
    output_compression: Optional[int] = None
    output_format: Optional[str] = None
    partial_images: Optional[int] = None
    quality: Optional[str] = None
    response_format: Optional[str] = None
    safety_identifier: Optional[str] = None
    size: Optional[str] = None
    stream: Optional[bool] = None
    svg: Optional[Dict[str, str]] = None
    user: Optional[str] = None
