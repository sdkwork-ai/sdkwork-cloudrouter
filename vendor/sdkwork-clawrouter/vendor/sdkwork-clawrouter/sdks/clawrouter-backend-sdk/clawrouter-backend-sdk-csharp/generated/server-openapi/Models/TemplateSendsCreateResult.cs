using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace Sdkwork.ClawRouter.Backend.Models
{
    public class TemplateSendsCreateResult
    {
        public string Code { get; set; }
        public MessagingTemplateSendResponse? Data { get; set; }
        public string? Msg { get; set; }
    }
}
