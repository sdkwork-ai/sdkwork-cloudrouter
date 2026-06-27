from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any

if TYPE_CHECKING:
    from .media_resource import MediaResource


@dataclass
class RuntimeArtifactItem:
    """Runtime artifact item schema exposed by Claw Router."""
    artifact_type: str
    created_at: str
    id: str
    invocation_id: str
    content_text: Optional[str] = None
    mime_type: Optional[str] = None
    name: Optional[str] = None
    resource: Optional[MediaResource] = None
    sha256: Optional[str] = None
    size_bytes: Optional[str] = None
    storage_key: Optional[str] = None
