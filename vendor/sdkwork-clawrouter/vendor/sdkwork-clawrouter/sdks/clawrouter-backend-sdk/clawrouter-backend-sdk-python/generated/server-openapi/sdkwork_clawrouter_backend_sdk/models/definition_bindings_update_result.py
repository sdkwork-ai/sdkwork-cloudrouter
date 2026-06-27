from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any

if TYPE_CHECKING:
    from .admin_prompt_binding_mutation_response import AdminPromptBindingMutationResponse


@dataclass
class DefinitionBindingsUpdateResult:
    """Definition bindings update result schema exposed by Claw Router."""
    code: str
    data: Optional[AdminPromptBindingMutationResponse] = None
    msg: Optional[str] = None
