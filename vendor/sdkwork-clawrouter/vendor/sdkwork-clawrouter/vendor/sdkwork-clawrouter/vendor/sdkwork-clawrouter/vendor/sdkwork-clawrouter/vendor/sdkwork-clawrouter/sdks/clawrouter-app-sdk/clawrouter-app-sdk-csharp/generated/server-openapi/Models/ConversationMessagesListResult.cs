using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace Sdkwork.ClawRouter.App.Models
{
    public class ConversationMessagesListResult
    {
        public string Code { get; set; }
        public ChatMessageListResponse? Data { get; set; }
        public string? Msg { get; set; }
    }
}
