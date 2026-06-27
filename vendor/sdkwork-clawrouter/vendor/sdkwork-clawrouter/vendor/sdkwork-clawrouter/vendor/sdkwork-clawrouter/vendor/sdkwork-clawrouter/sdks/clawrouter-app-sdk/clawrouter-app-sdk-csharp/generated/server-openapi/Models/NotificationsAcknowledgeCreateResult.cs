using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace Sdkwork.ClawRouter.App.Models
{
    public class NotificationsAcknowledgeCreateResult
    {
        public string Code { get; set; }
        public NotificationMutationResponse? Data { get; set; }
        public string? Msg { get; set; }
    }
}
