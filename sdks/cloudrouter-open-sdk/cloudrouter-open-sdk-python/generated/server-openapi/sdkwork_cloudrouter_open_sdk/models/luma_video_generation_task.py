from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any

if TYPE_CHECKING:
    from .luma_generation_assets import LumaGenerationAssets


@dataclass
class LumaVideoGenerationTask:
    """Luma Dream Machine generation record and its assets."""
    assets: Optional[LumaGenerationAssets] = None
    created_at: Optional[str] = None
    failure_reason: Optional[str] = None
    generation_type: Optional[str] = None
    id: Optional[str] = None
    model: Optional[str] = None
    request: Optional[Dict[str, str]] = None
    state: Optional[str] = None
