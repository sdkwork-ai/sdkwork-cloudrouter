from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any


@dataclass
class StorageBucketConfig:
    """Storage bucket config schema exposed by Claw Router."""
    bucket_name: str
    id: str
    logical_scope: str
    provider_code: str
    provider_id: str
    status: str
    block_public_access: Optional[bool] = None
    bucket_region: Optional[str] = None
    created_at: Optional[str] = None
    default_encryption_mode: Optional[str] = None
    default_storage_class: Optional[str] = None
    encryption: Optional[str] = None
    kms_key_ref: Optional[str] = None
    lifecycle_enabled: Optional[bool] = None
    object_key_prefix: Optional[str] = None
    object_lock_enabled: Optional[bool] = None
    public_access_blocked: Optional[bool] = None
    storage_class: Optional[str] = None
    updated_at: Optional[str] = None
    versioning_enabled: Optional[bool] = None
