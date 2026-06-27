from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any

if TYPE_CHECKING:
    from .storage_reconciliation_run_list_response import StorageReconciliationRunListResponse


@dataclass
class OssReconciliationRunsListResult:
    """Oss reconciliation runs list result schema exposed by Claw Router."""
    code: str
    data: Optional[StorageReconciliationRunListResponse] = None
    msg: Optional[str] = None
