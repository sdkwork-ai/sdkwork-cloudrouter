from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any


@dataclass
class StorageQuotaPolicy:
    """Storage quota policy schema exposed by Claw Router."""
    id: str
    quota_limit_bytes: str
    scope_id: str
    scope_type: str
    status: str
    used_bytes: str
    created_at: Optional[str] = None
    enforcement: Optional[str] = None
    limit: Optional[str] = None
    single_file_limit_bytes: Optional[str] = None
    updated_at: Optional[str] = None
    used: Optional[str] = None
