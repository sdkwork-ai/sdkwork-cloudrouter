import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
PORTAL_PACKAGES = ROOT / "apps" / "sdkwork-clawrouter-pc" / "packages"


def first_existing_path(*candidates: Path) -> Path:
    for candidate in candidates:
        if candidate.exists():
            return candidate
    return candidates[0]


class ConsoleMessagesRuntimeStandardTest(unittest.TestCase):
    def test_console_notification_route_and_navbar_use_notification_naming(self) -> None:
        app = (ROOT / "apps" / "sdkwork-clawrouter-pc" / "src" / "App.tsx").read_text(
            encoding="utf-8"
        )
        console_layout_path = first_existing_path(
            PORTAL_PACKAGES / "sdkwork-clawrouter-pc-console-shell" / "src" / "ConsoleLayout.tsx",
            PORTAL_PACKAGES / "sdkwork-clawrouter-pc-console-core" / "src" / "ConsoleLayout.tsx",
        )
        if not console_layout_path.exists():
            self.skipTest("console shell package is not available in this claw router surface")
        console_layout = console_layout_path.read_text(encoding="utf-8")
        navbar = (
            ROOT
            / "apps"
            / "sdkwork-clawrouter-pc"
            / "packages"
            / "sdkwork-clawroutes-pc-commons"
            / "src"
            / "components"
            / "Navbar.tsx"
        ).read_text(encoding="utf-8")

        self.assertIn('path="notifications"', app)
        self.assertIn('path="messages" element={<Navigate to="/console/notifications" replace />} />', app)
        self.assertIn("path: '/console/notifications'", console_layout)
        self.assertIn('to="/console/notifications"', navbar)
        self.assertIn("NotificationService.fetchNotifications()", navbar)
        self.assertNotIn("commons.navbar.notifications.modelRate", navbar)
        self.assertNotIn("commons.navbar.notifications.billGenerated", navbar)
        self.assertNotIn("commons.navbar.notifications.balanceWarning", navbar)
        self.assertNotIn('to="/console/messages"', navbar)

    def test_console_messages_ui_is_read_only_until_command_contract_exists(self) -> None:
        messages_view_path = (
            PORTAL_PACKAGES
            / "sdkwork-clawrouter-pc-console-messages"
            / "src"
            / "MessagesView.tsx"
        )
        messages_service_path = (
            PORTAL_PACKAGES
            / "sdkwork-clawrouter-pc-console-messages"
            / "src"
            / "messagesService.ts"
        )
        if not messages_view_path.exists() or not messages_service_path.exists():
            self.skipTest("console messages package is not available in this claw router surface")

        messages_view = messages_view_path.read_text(encoding="utf-8")
        messages_service = messages_service_path.read_text(encoding="utf-8")
        contract = (
            ROOT / "docs" / "schema-registry" / "frontend-field-contracts.yaml"
        ).read_text(encoding="utf-8")
        notification_operation_marker = (
            "  - route: /console/notifications\n"
            "    source: apps/sdkwork-clawrouter-pc/packages/"
            "sdkwork-clawrouter-pc-console-messages/src/messagesService.ts\n"
            "    operation: fetchMessages"
        )
        notification_operation_start = contract.index(notification_operation_marker)
        next_operation_start = contract.index("\n  - route:", notification_operation_start + 1)
        notification_operation_contract = contract[notification_operation_start:next_operation_start]

        self.assertIn("MessagesService.fetchMessages()", messages_view)
        self.assertNotIn("readOnlyMessageActions", messages_view)
        self.assertNotIn("Read-only", messages_view)
        self.assertNotIn("read-only", messages_view)
        self.assertNotIn("command contract", messages_view)
        self.assertIn("BusinessStatePanel", messages_view)
        self.assertNotIn("handleMarkAllRead", messages_view)
        self.assertNotIn("handleToggleRead", messages_view)
        self.assertNotIn("handleDelete", messages_view)
        self.assertNotIn("Auto mark as read", messages_view)
        self.assertNotIn("setMessages(msgs => msgs.map", messages_view)
        self.assertNotIn("setMessages(msgs => msgs.filter", messages_view)
        for icon in ["<Trash2", "<Check className"]:
            self.assertNotIn(icon, messages_view)
        self.assertNotIn("PDF", messages_view)

        self.assertNotIn("static async markMessageRead", messages_service)
        self.assertNotIn("static async markAllMessagesRead", messages_service)
        self.assertNotIn("static async deleteMessage", messages_service)
        self.assertIn("operation: fetchMessages", notification_operation_contract)
        self.assertNotIn("operation: markMessageRead", notification_operation_contract)
        self.assertNotIn("operation: markAllMessagesRead", notification_operation_contract)
        self.assertNotIn("operation: deleteMessage", notification_operation_contract)


if __name__ == "__main__":
    unittest.main()
