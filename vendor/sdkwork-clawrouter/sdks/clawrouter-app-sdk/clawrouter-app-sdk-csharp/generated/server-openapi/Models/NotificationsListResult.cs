using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace Sdkwork.ClawRouter.App.Models
{
    public class NotificationsListResult
    {
        public string Code { get; set; }
        public NotificationListResponse? Data { get; set; }
        public string? Msg { get; set; }
    }
}
