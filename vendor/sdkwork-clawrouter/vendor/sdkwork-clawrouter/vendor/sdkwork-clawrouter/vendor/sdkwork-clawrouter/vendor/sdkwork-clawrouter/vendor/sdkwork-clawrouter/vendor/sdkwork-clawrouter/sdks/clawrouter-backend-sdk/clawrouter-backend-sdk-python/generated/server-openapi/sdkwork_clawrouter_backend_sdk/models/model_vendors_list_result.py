from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any

if TYPE_CHECKING:
    from .admin_model_vendors_response import AdminModelVendorsResponse


@dataclass
class ModelVendorsListResult:
    """Model vendors list result schema exposed by Claw Router."""
    code: str
    data: Optional[AdminModelVendorsResponse] = None
    msg: Optional[str] = None
