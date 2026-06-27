from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any


@dataclass
class UpdateStorageProviderRequest:
    """Update storage provider request schema exposed by Claw Router."""
    reason: str
    status: str
