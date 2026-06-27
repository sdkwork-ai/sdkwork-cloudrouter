from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any

if TYPE_CHECKING:
    from .storage_quota_policy import StorageQuotaPolicy


@dataclass
class StorageQuotaPolicyMutationResponse:
    """Storage quota policy mutation response schema exposed by Claw Router."""
    quota_policy: StorageQuotaPolicy
    request_id: str
