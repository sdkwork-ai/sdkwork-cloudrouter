using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace Sdkwork.ClawRouter.Backend.Models
{
    public class VerificationPoliciesUpdateResult
    {
        public string Code { get; set; }
        public MessagingMutationResponse? Data { get; set; }
        public string? Msg { get; set; }
    }
}
