import type { GoogleBlob } from './google-blob';
import type { GoogleCodeExecutionResult } from './google-code-execution-result';
import type { GoogleExecutableCode } from './google-executable-code';
import type { GoogleFileData } from './google-file-data';
import type { GoogleFunctionCall } from './google-function-call';
import type { GoogleFunctionResponse } from './google-function-response';
import type { ProviderJsonValue } from './provider-json-value';

/** Google Gemini google part schema exposed by Cloud Router vendor routing. */
export interface GooglePart {
  /** Audio input or output transcription. */
  audioTranscription?: Record<string, ProviderJsonValue>;
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
  /** How the model processes this part's media. */
  mediaProcessing?: 'MEDIA_PROCESSING_UNSPECIFIED' | 'STATIC' | 'AGENTIC';
  /** Media resolution for the input media. */
  mediaResolution?: Record<string, ProviderJsonValue>;
  /** Custom metadata associated with the part. */
  partMetadata?: Record<string, ProviderJsonValue>;
  /** Metadata applied to text parts to customize speech output. */
  speechMetadata?: Record<string, ProviderJsonValue>;
  /** Text content part. */
  text?: string;
  /** Whether the part is a thought from the model. */
  thought?: boolean;
  /** Opaque signature for the thought so it can be reused in subsequent requests. */
  thoughtSignature?: string;
  /** Server-side tool call. */
  toolCall?: Record<string, ProviderJsonValue>;
  /** Output from a server-side tool execution. */
  toolResponse?: Record<string, ProviderJsonValue>;
  /** Video metadata for video inputs. */
  videoMetadata?: Record<string, ProviderJsonValue>;
}
