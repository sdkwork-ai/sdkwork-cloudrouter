from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any


@dataclass
class StorageDefaultBucketConfig:
    """Storage default bucket config schema exposed by Claw Router."""
    bucket_id: str
    bucket_name: str
    id: str
    logical_scope: str
    provider_code: str
    provider_id: str
    status: str
    data_residency_region: Optional[str] = None
    provider_type: Optional[str] = None
    reason: Optional[str] = None
    region: Optional[str] = None
    updated_at: Optional[str] = None
