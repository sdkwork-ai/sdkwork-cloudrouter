using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace Sdkwork.ClawRouter.App.Models
{
    public class ConversationsRetrieveResult
    {
        public string Code { get; set; }
        public ChatConversationItem? Data { get; set; }
        public string? Msg { get; set; }
    }
}
