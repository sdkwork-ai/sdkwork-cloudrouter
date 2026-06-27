from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any

if TYPE_CHECKING:
    from .google_code_execution_tool import GoogleCodeExecutionTool
    from .google_function_declaration import GoogleFunctionDeclaration
    from .google_search_tool import GoogleSearchTool
    from .google_url_context_tool import GoogleUrlContextTool


@dataclass
class GoogleTool:
    """Google Gemini google tool schema exposed by Claw Router vendor routing."""
    code_execution: Optional[GoogleCodeExecutionTool] = None
    function_declarations: Optional[List[GoogleFunctionDeclaration]] = None
    google_search: Optional[GoogleSearchTool] = None
    url_context: Optional[GoogleUrlContextTool] = None
