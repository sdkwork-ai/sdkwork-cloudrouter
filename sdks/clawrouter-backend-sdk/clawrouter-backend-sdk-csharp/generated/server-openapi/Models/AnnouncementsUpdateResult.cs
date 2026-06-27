using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace Sdkwork.ClawRouter.Backend.Models
{
    public class AnnouncementsUpdateResult
    {
        public string Code { get; set; }
        public AdminAnnouncementMutationResponse? Data { get; set; }
        public string? Msg { get; set; }
    }
}
