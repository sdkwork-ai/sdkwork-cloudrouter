from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any

if TYPE_CHECKING:
    from .kling_image_result import KlingImageResult


@dataclass
class KlingImageTaskResult:
    """Kling image task output."""
    images: Optional[List[KlingImageResult]] = None
