from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any

if TYPE_CHECKING:
    from .xai_generated_image import XaiGeneratedImage
    from .xai_usage import XaiUsage


@dataclass
class XaiDeferredImageResponse:
    """xAI deferred-image poll result: HTTP 202 while pending, 200 with data when done, or a body error when failed."""
    request_id: str
    status: str
    data: Optional[List[XaiGeneratedImage]] = None
    error: Optional[Dict[str, str]] = None
    usage: Optional[XaiUsage] = None
