using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace Sdkwork.ClawRouter.Backend.Models
{
    public class AdminAnnouncementUpdateRequest
    {
        public string? Content { get; set; }
        public bool? ShowAsPopup { get; set; }
        public string? Status { get; set; }
        public string? Target { get; set; }
        public string? Title { get; set; }
    }
}
