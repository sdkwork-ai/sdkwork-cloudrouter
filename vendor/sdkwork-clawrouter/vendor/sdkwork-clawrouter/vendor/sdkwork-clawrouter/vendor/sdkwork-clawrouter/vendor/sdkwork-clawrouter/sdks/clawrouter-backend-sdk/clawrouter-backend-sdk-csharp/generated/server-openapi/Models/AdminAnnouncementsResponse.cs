using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace Sdkwork.ClawRouter.Backend.Models
{
    public class AdminAnnouncementsResponse
    {
        public List<AdminAnnouncementItem> Items { get; set; }
    }
}
