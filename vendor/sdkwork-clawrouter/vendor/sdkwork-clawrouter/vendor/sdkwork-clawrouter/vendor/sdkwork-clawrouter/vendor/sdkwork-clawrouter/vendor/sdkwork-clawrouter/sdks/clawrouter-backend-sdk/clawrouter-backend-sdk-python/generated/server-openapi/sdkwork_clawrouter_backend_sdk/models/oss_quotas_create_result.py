from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any

if TYPE_CHECKING:
    from .storage_quota_policy_mutation_response import StorageQuotaPolicyMutationResponse


@dataclass
class OssQuotasCreateResult:
    """Oss quotas create result schema exposed by Claw Router."""
    code: str
    data: Optional[StorageQuotaPolicyMutationResponse] = None
    msg: Optional[str] = None
