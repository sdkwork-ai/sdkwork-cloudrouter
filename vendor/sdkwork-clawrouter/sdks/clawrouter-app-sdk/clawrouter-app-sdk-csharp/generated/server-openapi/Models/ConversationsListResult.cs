using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace Sdkwork.ClawRouter.App.Models
{
    public class ConversationsListResult
    {
        public string Code { get; set; }
        public ChatConversationListResponse? Data { get; set; }
        public string? Msg { get; set; }
    }
}
