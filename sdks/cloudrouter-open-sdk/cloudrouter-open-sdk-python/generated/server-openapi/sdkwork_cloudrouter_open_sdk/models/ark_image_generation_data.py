from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any

if TYPE_CHECKING:
    from .provider_task_error import ProviderTaskError


@dataclass
class ArkImageGenerationData:
    """One generated image record returned by Ark."""
    b64_json: Optional[str] = None
    bounding_box: Optional[Dict[str, str]] = None
    description: Optional[str] = None
    error: Optional[ProviderTaskError] = None
    name: Optional[str] = None
    output_format: Optional[str] = None
    size: Optional[str] = None
    url: Optional[str] = None
    z_index: Optional[int] = None
