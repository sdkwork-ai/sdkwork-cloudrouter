from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any

if TYPE_CHECKING:
    from .admin_model_mapping_resolve_response import AdminModelMappingResolveResponse


@dataclass
class ModelMappingsResolveCreateResult:
    """Model mappings resolve create result schema exposed by Claw Router."""
    code: str
    data: Optional[AdminModelMappingResolveResponse] = None
    msg: Optional[str] = None
