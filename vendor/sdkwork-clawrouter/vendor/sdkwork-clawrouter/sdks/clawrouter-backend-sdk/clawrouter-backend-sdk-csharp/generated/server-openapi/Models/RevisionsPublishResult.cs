using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace Sdkwork.ClawRouter.Backend.Models
{
    public class RevisionsPublishResult
    {
        public string Code { get; set; }
        public AdminMcpServerRevisionMutationResponse? Data { get; set; }
        public string? Msg { get; set; }
    }
}
