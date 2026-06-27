using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace Sdkwork.ClawRouter.App.Models
{
    public class ChatConversationListResponse
    {
        public List<ChatConversationItem> Items { get; set; }
    }
}
