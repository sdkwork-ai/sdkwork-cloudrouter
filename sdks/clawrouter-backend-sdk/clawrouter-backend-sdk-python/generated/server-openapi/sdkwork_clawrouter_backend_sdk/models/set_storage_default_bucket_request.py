from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any


@dataclass
class SetStorageDefaultBucketRequest:
    """Set storage default bucket request schema exposed by Claw Router."""
    bucket_id: str
    reason: str
