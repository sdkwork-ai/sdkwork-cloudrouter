from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any

if TYPE_CHECKING:
    from .admin_model_mapping_mutation_response import AdminModelMappingMutationResponse


@dataclass
class ModelMappingsCreateResult:
    """Model mappings create result schema exposed by Claw Router."""
    code: str
    data: Optional[AdminModelMappingMutationResponse] = None
    msg: Optional[str] = None
