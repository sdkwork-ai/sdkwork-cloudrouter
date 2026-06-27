from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any

if TYPE_CHECKING:
    from .admin_model_mappings_response import AdminModelMappingsResponse


@dataclass
class ModelMappingsListResult:
    """Model mappings list result schema exposed by Claw Router."""
    code: str
    data: Optional[AdminModelMappingsResponse] = None
    msg: Optional[str] = None
