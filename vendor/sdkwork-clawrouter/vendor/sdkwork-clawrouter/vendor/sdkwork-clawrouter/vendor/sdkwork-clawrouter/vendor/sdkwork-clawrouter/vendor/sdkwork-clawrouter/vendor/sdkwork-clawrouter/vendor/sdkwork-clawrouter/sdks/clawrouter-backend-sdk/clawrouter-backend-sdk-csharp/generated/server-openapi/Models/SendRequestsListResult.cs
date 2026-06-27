using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace Sdkwork.ClawRouter.Backend.Models
{
    public class SendRequestsListResult
    {
        public string Code { get; set; }
        public MessagingCollectionResponse? Data { get; set; }
        public string? Msg { get; set; }
    }
}
