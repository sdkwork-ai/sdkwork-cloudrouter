from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any


@dataclass
class AlibabaVideoGenerationRequest:
    """Alibaba DashScope Wan video generation request (`POST /api/v1/services/aigc/video-generation/video-synthesis`)."""
    input: Dict[str, str]
    model: str
    parameters: Optional[Dict[str, str]] = None
