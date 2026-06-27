using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace Sdkwork.ClawRouter.Backend.Models
{
    public class DiagnosticsTestSendsCreateResult
    {
        public string Code { get; set; }
        public MessagingTestSendResponse? Data { get; set; }
        public string? Msg { get; set; }
    }
}
