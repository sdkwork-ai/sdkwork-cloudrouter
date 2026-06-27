using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace Sdkwork.ClawRouter.App.Models
{
    public class NotificationItem
    {
        public string? ActionUrl { get; set; }
        public string AppId { get; set; }
        public bool Archived { get; set; }
        public string Content { get; set; }
        public string Desc { get; set; }
        public string Id { get; set; }
        public bool PopupSeen { get; set; }
        public bool Read { get; set; }
        public bool ShowAsPopup { get; set; }
        public string Time { get; set; }
        public string Title { get; set; }
        public string Type { get; set; }
    }
}
