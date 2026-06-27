from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any

if TYPE_CHECKING:
    from .storage_usage_counter_list_response import StorageUsageCounterListResponse


@dataclass
class OssUsageListResult:
    """Oss usage list result schema exposed by Claw Router."""
    code: str
    data: Optional[StorageUsageCounterListResponse] = None
    msg: Optional[str] = None
