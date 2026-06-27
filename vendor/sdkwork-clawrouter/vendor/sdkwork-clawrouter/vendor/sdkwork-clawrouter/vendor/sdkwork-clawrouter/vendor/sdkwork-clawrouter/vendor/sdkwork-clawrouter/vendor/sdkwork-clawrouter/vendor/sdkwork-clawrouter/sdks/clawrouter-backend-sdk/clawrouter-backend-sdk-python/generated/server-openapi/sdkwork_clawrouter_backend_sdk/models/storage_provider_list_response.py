from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any

if TYPE_CHECKING:
    from .storage_provider_config import StorageProviderConfig


@dataclass
class StorageProviderListResponse:
    """Storage provider list response schema exposed by Claw Router."""
    items: List[StorageProviderConfig]
    request_id: str
