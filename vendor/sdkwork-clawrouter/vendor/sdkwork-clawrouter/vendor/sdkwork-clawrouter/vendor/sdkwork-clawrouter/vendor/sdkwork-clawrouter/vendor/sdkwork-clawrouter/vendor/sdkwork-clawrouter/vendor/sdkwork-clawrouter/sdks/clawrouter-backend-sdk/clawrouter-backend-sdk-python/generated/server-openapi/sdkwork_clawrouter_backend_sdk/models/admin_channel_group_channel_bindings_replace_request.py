from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any

if TYPE_CHECKING:
    from .admin_channel_group_channel_binding_input import AdminChannelGroupChannelBindingInput


@dataclass
class AdminChannelGroupChannelBindingsReplaceRequest:
    """Admin channel group channel bindings replace request schema exposed by Claw Router."""
    items: List[AdminChannelGroupChannelBindingInput]
