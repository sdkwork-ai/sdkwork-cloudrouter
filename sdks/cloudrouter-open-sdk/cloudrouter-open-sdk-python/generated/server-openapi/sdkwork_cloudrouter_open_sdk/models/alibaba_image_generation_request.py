from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any


@dataclass
class AlibabaImageGenerationRequest:
    """Alibaba DashScope Wanx image generation request (`POST /api/v1/services/aigc/text2image/image-synthesis`)."""
    input: Dict[str, str]
    model: str
    parameters: Optional[Dict[str, str]] = None
