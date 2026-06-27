import type { GoogleBlob } from './google-blob';
import type { GoogleCodeExecutionResult } from './google-code-execution-result';
import type { GoogleExecutableCode } from './google-executable-code';
import type { GoogleFileData } from './google-file-data';
import type { GoogleFunctionCall } from './google-function-call';
import type { GoogleFunctionResponse } from './google-function-response';
import type { ProviderJsonValue } from './provider-json-value';

/** Google Gemini google part schema exposed by Claw Router vendor routing. */
export interface GooglePart {
  /** Code execution result field on the google part, using the google code execution result module. */
  codeExecutionResult?: GoogleCodeExecutionResult;
  /** Executable code field on the google part, using the google executable code module. */
  executableCode?: GoogleExecutableCode;
  /** File data field on the google part, using the google file data module. */
  fileData?: GoogleFileData;
  /** Function call field on the google part, using the google function call module. */
  functionCall?: GoogleFunctionCall;
  /** Function response field on the google part, using the google function response module. */
  functionResponse?: GoogleFunctionResponse;
  /** Inline data field on the google part, using the google blob module. */
  inlineData?: GoogleBlob;
  /** Text content part. */
  text?: string;
}
