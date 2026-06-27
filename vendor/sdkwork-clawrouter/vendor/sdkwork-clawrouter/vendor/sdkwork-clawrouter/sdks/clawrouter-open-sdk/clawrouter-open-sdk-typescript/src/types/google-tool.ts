import type { GoogleCodeExecutionTool } from './google-code-execution-tool';
import type { GoogleFunctionDeclaration } from './google-function-declaration';
import type { GoogleSearchTool } from './google-search-tool';
import type { GoogleUrlContextTool } from './google-url-context-tool';
import type { ProviderJsonValue } from './provider-json-value';

/** Google Gemini google tool schema exposed by Claw Router vendor routing. */
export interface GoogleTool {
  /** Code execution field on the google tool, using the google code execution tool module. */
  codeExecution?: GoogleCodeExecutionTool;
  /** Callable function declarations. */
  functionDeclarations?: GoogleFunctionDeclaration[];
  /** Google search field on the google tool, using the google search tool module. */
  googleSearch?: GoogleSearchTool;
  /** Url context field on the google tool, using the google url context tool module. */
  urlContext?: GoogleUrlContextTool;
}
