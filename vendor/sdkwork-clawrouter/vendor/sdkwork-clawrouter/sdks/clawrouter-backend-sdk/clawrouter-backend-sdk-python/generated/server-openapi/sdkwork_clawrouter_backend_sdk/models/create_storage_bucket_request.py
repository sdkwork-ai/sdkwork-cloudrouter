from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any


@dataclass
class CreateStorageBucketRequest:
    """Create storage bucket request schema exposed by Claw Router."""
    bucket_name: str
    logical_scope: str
    provider_id: str
    block_public_access: Optional[bool] = None
    bucket_region: Optional[str] = None
    data_residency_region: Optional[str] = None
    default_encryption_mode: Optional[str] = None
    default_storage_class: Optional[str] = None
    encryption: Optional[str] = None
    kms_key_ref: Optional[str] = None
    lifecycle_enabled: Optional[bool] = None
    object_key_prefix: Optional[str] = None
    object_lock_enabled: Optional[bool] = None
    public_access_blocked: Optional[bool] = None
    storage_class: Optional[str] = None
    versioning_enabled: Optional[bool] = None
