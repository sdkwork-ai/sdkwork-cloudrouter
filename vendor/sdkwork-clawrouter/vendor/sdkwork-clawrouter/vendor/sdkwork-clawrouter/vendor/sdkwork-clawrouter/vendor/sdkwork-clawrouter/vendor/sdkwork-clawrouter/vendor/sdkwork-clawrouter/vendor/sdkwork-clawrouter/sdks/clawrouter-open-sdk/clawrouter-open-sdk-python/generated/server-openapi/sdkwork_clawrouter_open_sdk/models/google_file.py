from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any

if TYPE_CHECKING:
    from .provider_task_error import ProviderTaskError


@dataclass
class GoogleFile:
    """Google Gemini google file schema exposed by Claw Router vendor routing."""
    create_time: Optional[str] = None
    display_name: Optional[str] = None
    error: Optional[ProviderTaskError] = None
    expiration_time: Optional[str] = None
    mime_type: Optional[str] = None
    name: Optional[str] = None
    sha256hash: Optional[str] = None
    size_bytes: Optional[str] = None
    state: Optional[str] = None
    update_time: Optional[str] = None
    uri: Optional[str] = None
