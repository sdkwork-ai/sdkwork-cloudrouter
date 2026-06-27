from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any

if TYPE_CHECKING:
    from .storage_provider_list_response import StorageProviderListResponse


@dataclass
class OssProvidersListResult:
    """Oss providers list result schema exposed by Claw Router."""
    code: str
    data: Optional[StorageProviderListResponse] = None
    msg: Optional[str] = None
