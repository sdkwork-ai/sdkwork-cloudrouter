from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any

if TYPE_CHECKING:
    from .storage_usage_ledger_list_response import StorageUsageLedgerListResponse


@dataclass
class OssUsageLedgerListResult:
    """Oss usage ledger list result schema exposed by Claw Router."""
    code: str
    data: Optional[StorageUsageLedgerListResponse] = None
    msg: Optional[str] = None
