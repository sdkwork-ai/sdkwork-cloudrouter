from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any

if TYPE_CHECKING:
    from .provider_generated_media import ProviderGeneratedMedia
    from .provider_task_error import ProviderTaskError


@dataclass
class KlingVideoGenerationTask:
    """Kling-compatible kling video generation task schema exposed by Claw Router vendor routing."""
    created_at: Optional[str] = None
    error: Optional[ProviderTaskError] = None
    id: Optional[str] = None
    model: Optional[str] = None
    prompt: Optional[str] = None
    state: Optional[str] = None
    status: Optional[str] = None
    task_id: Optional[str] = None
    updated_at: Optional[str] = None
    videos: Optional[List[ProviderGeneratedMedia]] = None
