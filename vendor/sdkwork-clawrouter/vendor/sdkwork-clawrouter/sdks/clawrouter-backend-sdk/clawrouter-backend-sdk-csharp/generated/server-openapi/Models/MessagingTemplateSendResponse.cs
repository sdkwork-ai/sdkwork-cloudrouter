using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace Sdkwork.ClawRouter.Backend.Models
{
    public class MessagingTemplateSendResponse
    {
        public string DeliveryStatus { get; set; }
        public string? ProviderCode { get; set; }
        public string RequestId { get; set; }
    }
}
