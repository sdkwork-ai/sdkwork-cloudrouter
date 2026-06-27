from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any


@dataclass
class CreateStorageReconciliationRunRequest:
    """Create storage reconciliation run request schema exposed by Claw Router."""
    dry_run: bool
    run_type: str
    bucket_id: Optional[str] = None
    check_mode: Optional[str] = None
    provider_id: Optional[str] = None
    reason: Optional[str] = None
