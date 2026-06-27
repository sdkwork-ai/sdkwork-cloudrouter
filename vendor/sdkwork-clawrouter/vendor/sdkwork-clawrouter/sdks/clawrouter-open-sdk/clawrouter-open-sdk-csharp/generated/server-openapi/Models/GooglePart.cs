using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace Sdkwork.ClawRouter.Open.Models
{
    public class GooglePart
    {
        public GoogleCodeExecutionResult? CodeExecutionResult { get; set; }
        public GoogleExecutableCode? ExecutableCode { get; set; }
        public GoogleFileData? FileData { get; set; }
        public GoogleFunctionCall? FunctionCall { get; set; }
        public GoogleFunctionResponse? FunctionResponse { get; set; }
        public GoogleBlob? InlineData { get; set; }
        public string? Text { get; set; }
    }
}
