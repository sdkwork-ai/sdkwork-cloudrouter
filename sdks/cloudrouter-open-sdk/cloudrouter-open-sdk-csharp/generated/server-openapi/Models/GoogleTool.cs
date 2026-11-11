using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace Sdkwork.CloudRouter.Open.Models
{
    public class GoogleTool
    {
        public GoogleCodeExecutionTool? CodeExecution { get; set; }
        public Dictionary<string, string>? ComputerUse { get; set; }
        public Dictionary<string, string>? FileSearch { get; set; }
        public List<GoogleFunctionDeclaration>? FunctionDeclarations { get; set; }
        public Dictionary<string, string>? GoogleMaps { get; set; }
        public GoogleSearchTool? GoogleSearch { get; set; }
        public Dictionary<string, string>? GoogleSearchRetrieval { get; set; }
        public List<Dictionary<string, string>>? McpServers { get; set; }
        public GoogleUrlContextTool? UrlContext { get; set; }
    }
}
