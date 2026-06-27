from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any

if TYPE_CHECKING:
    from .media_access import MediaAccess
    from .media_ai_provenance import MediaAiProvenance
    from .media_checksum import MediaChecksum


@dataclass
class MediaResource:
    """Media resource schema exposed by Claw Router."""
    kind: str
    source: str
    access: Optional[MediaAccess] = None
    ai: Optional[MediaAiProvenance] = None
    alt_text: Optional[str] = None
    bucket_id: Optional[str] = None
    checksum: Optional[MediaChecksum] = None
    duration_seconds: Optional[float] = None
    file_name: Optional[str] = None
    height: Optional[int] = None
    id: Optional[str] = None
    metadata: Optional[Dict[str, str]] = None
    mime_type: Optional[str] = None
    object_blob_id: Optional[str] = None
    object_key: Optional[str] = None
    object_version: Optional[str] = None
    poster: Optional[MediaResource] = None
    public_url: Optional[str] = None
    size_bytes: Optional[str] = None
    thumbnails: Optional[List[MediaResource]] = None
    title: Optional[str] = None
    uri: Optional[str] = None
    url: Optional[str] = None
    variants: Optional[List[MediaResource]] = None
    width: Optional[int] = None
