from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any

if TYPE_CHECKING:
    from .provider_generated_media import ProviderGeneratedMedia
    from .volcengine_content_part import VolcengineContentPart


@dataclass
class ProviderTaskResult:
    """Provider task result payload with common media result fields and typed extension values."""
    audios: Optional[List[ProviderGeneratedMedia]] = None
    content: Optional[List[VolcengineContentPart]] = None
    id: Optional[str] = None
    images: Optional[List[ProviderGeneratedMedia]] = None
    metadata: Optional[Dict[str, str]] = None
    status: Optional[str] = None
    text: Optional[str] = None
    videos: Optional[List[ProviderGeneratedMedia]] = None
