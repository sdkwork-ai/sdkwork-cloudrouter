from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any


@dataclass
class XaiImageGenerationRequest:
    """xAI Grok Imagine image generation request (GenerateImageRequest)."""
    prompt: str
    aspect_ratio: Optional[str] = None
    deferred: Optional[bool] = None
    model: Optional[str] = None
    n: Optional[int] = None
    output: Optional[Dict[str, str]] = None
    resolution: Optional[str] = None
    response_format: Optional[str] = None
    storage_options: Optional[Dict[str, str]] = None
    user: Optional[str] = None
