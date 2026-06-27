using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace Sdkwork.ClawRouter.Open.Models
{
    public class GoogleTool
    {
        public GoogleCodeExecutionTool? CodeExecution { get; set; }
        public List<GoogleFunctionDeclaration>? FunctionDeclarations { get; set; }
        public GoogleSearchTool? GoogleSearch { get; set; }
        public GoogleUrlContextTool? UrlContext { get; set; }
    }
}
