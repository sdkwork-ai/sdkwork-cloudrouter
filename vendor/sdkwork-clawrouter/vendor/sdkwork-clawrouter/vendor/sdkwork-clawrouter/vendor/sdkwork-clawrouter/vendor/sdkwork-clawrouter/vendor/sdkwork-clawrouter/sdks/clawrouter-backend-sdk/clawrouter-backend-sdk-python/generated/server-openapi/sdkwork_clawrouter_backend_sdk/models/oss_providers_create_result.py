from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any

if TYPE_CHECKING:
    from .storage_provider_mutation_response import StorageProviderMutationResponse


@dataclass
class OssProvidersCreateResult:
    """Oss providers create result schema exposed by Claw Router."""
    code: str
    data: Optional[StorageProviderMutationResponse] = None
    msg: Optional[str] = None
