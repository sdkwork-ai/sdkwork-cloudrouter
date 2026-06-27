from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any

if TYPE_CHECKING:
    from .storage_reconciliation_run_mutation_response import StorageReconciliationRunMutationResponse


@dataclass
class OssReconciliationRunsCreateResult:
    """Oss reconciliation runs create result schema exposed by Claw Router."""
    code: str
    data: Optional[StorageReconciliationRunMutationResponse] = None
    msg: Optional[str] = None
