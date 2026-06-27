from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any

if TYPE_CHECKING:
    from .media_resource import MediaResource


@dataclass
class RuntimeArtifactCreateRequest:
    """Runtime artifact create request schema exposed by Claw Router."""
    artifact_type: str
    content_json: Optional[Dict[str, str]] = None
    content_text: Optional[str] = None
    metadata: Optional[Dict[str, str]] = None
    mime_type: Optional[str] = None
    name: Optional[str] = None
    resource: Optional[MediaResource] = None
    sha256: Optional[str] = None
    size_bytes: Optional[str] = None
    storage_key: Optional[str] = None
