using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace Sdkwork.ClawRouter.Backend.Models
{
    public class AdminAnnouncementItem
    {
        public string Content { get; set; }
        public string Date { get; set; }
        public string Id { get; set; }
        public bool ShowAsPopup { get; set; }
        public string Status { get; set; }
        public string Target { get; set; }
        public string Title { get; set; }
    }
}
