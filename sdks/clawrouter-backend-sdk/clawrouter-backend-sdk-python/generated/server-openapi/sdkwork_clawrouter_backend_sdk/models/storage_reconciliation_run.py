from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any


@dataclass
class StorageReconciliationRun:
    """Storage reconciliation run schema exposed by Claw Router."""
    id: str
    run_id: str
    status: str
    bucket_id: Optional[str] = None
    bucket_name: Optional[str] = None
    dry_run: Optional[bool] = None
    finished_at: Optional[str] = None
    issue_count: Optional[str] = None
    issues: Optional[str] = None
    provider_code: Optional[str] = None
    provider_id: Optional[str] = None
    run_type: Optional[str] = None
    scope: Optional[str] = None
    started_at: Optional[str] = None
