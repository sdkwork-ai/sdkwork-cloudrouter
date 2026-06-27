from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any

if TYPE_CHECKING:
    from .storage_reconciliation_run import StorageReconciliationRun


@dataclass
class StorageReconciliationRunListResponse:
    """Storage reconciliation run list response schema exposed by Claw Router."""
    items: List[StorageReconciliationRun]
    request_id: str
    next_cursor: Optional[str] = None
