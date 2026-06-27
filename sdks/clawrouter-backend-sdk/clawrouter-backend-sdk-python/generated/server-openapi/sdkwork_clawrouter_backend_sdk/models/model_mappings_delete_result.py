from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any

if TYPE_CHECKING:
    from .admin_model_mapping_delete_response import AdminModelMappingDeleteResponse


@dataclass
class ModelMappingsDeleteResult:
    """Model mappings delete result schema exposed by Claw Router."""
    code: str
    data: Optional[AdminModelMappingDeleteResponse] = None
    msg: Optional[str] = None
