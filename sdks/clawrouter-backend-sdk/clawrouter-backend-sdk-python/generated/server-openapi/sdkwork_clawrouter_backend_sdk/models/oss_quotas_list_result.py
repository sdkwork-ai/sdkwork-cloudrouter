from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any

if TYPE_CHECKING:
    from .storage_quota_policy_list_response import StorageQuotaPolicyListResponse


@dataclass
class OssQuotasListResult:
    """Oss quotas list result schema exposed by Claw Router."""
    code: str
    data: Optional[StorageQuotaPolicyListResponse] = None
    msg: Optional[str] = None
