from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any

if TYPE_CHECKING:
    from .storage_provider_config import StorageProviderConfig


@dataclass
class StorageProviderMutationResponse:
    """Storage provider mutation response schema exposed by Claw Router."""
    provider: StorageProviderConfig
    request_id: str
