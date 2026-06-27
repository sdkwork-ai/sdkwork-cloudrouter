from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any


@dataclass
class AdminModelVendorCreateRequest:
    """Admin model vendor create request schema exposed by Claw Router."""
    name: str
    color: Optional[str] = None
    description: Optional[str] = None
    status: Optional[str] = None
    vendor_code: Optional[str] = None
