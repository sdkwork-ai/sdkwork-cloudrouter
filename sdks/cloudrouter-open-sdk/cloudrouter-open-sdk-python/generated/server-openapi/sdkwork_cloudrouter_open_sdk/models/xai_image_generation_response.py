from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any

if TYPE_CHECKING:
    from .xai_generated_image import XaiGeneratedImage
    from .xai_usage import XaiUsage


@dataclass
class XaiImageGenerationResponse:
    """xAI generated-image response (GeneratedImageResponse)."""
    data: List[XaiGeneratedImage]
    usage: Optional[XaiUsage] = None
