using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace Sdkwork.ClawRouter.App.Models
{
    public class ConversationsCreateResult
    {
        public string Code { get; set; }
        public ChatConversationResponse? Data { get; set; }
        public string? Msg { get; set; }
    }
}
