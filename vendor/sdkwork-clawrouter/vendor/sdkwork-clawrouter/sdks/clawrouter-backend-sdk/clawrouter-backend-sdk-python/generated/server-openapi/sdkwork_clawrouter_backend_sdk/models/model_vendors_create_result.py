from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any

if TYPE_CHECKING:
    from .admin_model_vendor_mutation_response import AdminModelVendorMutationResponse


@dataclass
class ModelVendorsCreateResult:
    """Model vendors create result schema exposed by Claw Router."""
    code: str
    data: Optional[AdminModelVendorMutationResponse] = None
    msg: Optional[str] = None
