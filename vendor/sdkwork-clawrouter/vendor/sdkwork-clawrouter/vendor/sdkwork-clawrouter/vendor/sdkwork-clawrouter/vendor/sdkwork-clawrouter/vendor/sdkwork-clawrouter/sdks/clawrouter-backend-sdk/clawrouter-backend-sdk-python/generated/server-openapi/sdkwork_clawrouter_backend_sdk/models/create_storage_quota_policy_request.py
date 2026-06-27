from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any


@dataclass
class CreateStorageQuotaPolicyRequest:
    """Create storage quota policy request schema exposed by Claw Router."""
    quota_limit_bytes: str
    scope_id: str
    scope_type: str
    enforcement: Optional[str] = None
    quota_limit: Optional[str] = None
    single_file_limit_bytes: Optional[str] = None
