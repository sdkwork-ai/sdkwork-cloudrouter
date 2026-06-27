from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any

if TYPE_CHECKING:
    from .google_blob import GoogleBlob
    from .google_code_execution_result import GoogleCodeExecutionResult
    from .google_executable_code import GoogleExecutableCode
    from .google_file_data import GoogleFileData
    from .google_function_call import GoogleFunctionCall
    from .google_function_response import GoogleFunctionResponse


@dataclass
class GooglePart:
    """Google Gemini google part schema exposed by Claw Router vendor routing."""
    code_execution_result: Optional[GoogleCodeExecutionResult] = None
    executable_code: Optional[GoogleExecutableCode] = None
    file_data: Optional[GoogleFileData] = None
    function_call: Optional[GoogleFunctionCall] = None
    function_response: Optional[GoogleFunctionResponse] = None
    inline_data: Optional[GoogleBlob] = None
    text: Optional[str] = None
