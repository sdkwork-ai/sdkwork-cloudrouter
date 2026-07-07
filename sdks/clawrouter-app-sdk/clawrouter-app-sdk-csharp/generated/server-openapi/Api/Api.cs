namespace Sdkwork.ClawRouter.App.Api
{
    /// <summary>
    /// API modules for clawrouter-app-sdk
    /// </summary>
    public static class Api
    {
        public static SystemApi? System { get; set; }
        public static AiApi? Ai { get; set; }
        public static ChatApi? Chat { get; set; }
        public static IamApi? Iam { get; set; }
        public static NotificationApi? Notification { get; set; }
        public static RuntimeApi? Runtime { get; set; }
    }
}
