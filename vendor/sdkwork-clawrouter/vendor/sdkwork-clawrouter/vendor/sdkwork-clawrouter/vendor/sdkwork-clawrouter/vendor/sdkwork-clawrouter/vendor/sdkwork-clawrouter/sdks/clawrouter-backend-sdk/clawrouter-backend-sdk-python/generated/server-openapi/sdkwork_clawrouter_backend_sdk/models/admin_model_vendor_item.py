from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any


@dataclass
class AdminModelVendorItem:
    """Admin model vendor item schema exposed by Claw Router."""
    color: str
    description: str
    id: str
    name: str
    status: str
    vendor_code: str
