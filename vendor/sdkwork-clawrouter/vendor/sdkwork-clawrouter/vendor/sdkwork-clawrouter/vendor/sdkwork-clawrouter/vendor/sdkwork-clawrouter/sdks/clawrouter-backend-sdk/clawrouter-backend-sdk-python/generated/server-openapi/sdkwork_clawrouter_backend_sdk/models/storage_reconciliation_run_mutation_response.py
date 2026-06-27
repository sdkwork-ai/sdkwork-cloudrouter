from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any

if TYPE_CHECKING:
    from .storage_reconciliation_run import StorageReconciliationRun


@dataclass
class StorageReconciliationRunMutationResponse:
    """Storage reconciliation run mutation response schema exposed by Claw Router."""
    reconciliation_run: StorageReconciliationRun
    request_id: str
