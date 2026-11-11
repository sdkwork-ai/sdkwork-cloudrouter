using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace Sdkwork.CloudRouter.Open.Models
{
    public class GooglePart
    {
        public Dictionary<string, string>? AudioTranscription { get; set; }
        public GoogleCodeExecutionResult? CodeExecutionResult { get; set; }
        public GoogleExecutableCode? ExecutableCode { get; set; }
        public GoogleFileData? FileData { get; set; }
        public GoogleFunctionCall? FunctionCall { get; set; }
        public GoogleFunctionResponse? FunctionResponse { get; set; }
        public GoogleBlob? InlineData { get; set; }
        public string? MediaProcessing { get; set; }
        public Dictionary<string, string>? MediaResolution { get; set; }
        public Dictionary<string, string>? PartMetadata { get; set; }
        public Dictionary<string, string>? SpeechMetadata { get; set; }
        public string? Text { get; set; }
        public bool? Thought { get; set; }
        public string? ThoughtSignature { get; set; }
        public Dictionary<string, string>? ToolCall { get; set; }
        public Dictionary<string, string>? ToolResponse { get; set; }
        public Dictionary<string, string>? VideoMetadata { get; set; }
    }
}
