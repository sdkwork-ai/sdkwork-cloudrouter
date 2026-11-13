import 'package:flutter/material.dart';

/// Cloud Router home for the Flutter mobile shell.
///
/// Mirrors the public H5 cloud-platform home: hero + search, four primary
/// actions, a ten-service grid, announcement, promotion, experience-center
/// entry, and platform stats. Navigation targets are owned by the shell; the
/// screen only emits destinations so the tab index stays in one place.
class ConsoleHomeScreen extends StatelessWidget {
  const ConsoleHomeScreen({required this.onNavigate, super.key});

  /// Receives `usage`, `apiKeys`, `catalog`, or `profile` for destinations the
  /// shell owns; other service keys are handled by an in-screen notice until
  /// their route is available on this surface.
  final ValueChanged<String> onNavigate;

  static const List<_HomeAction> _primaryActions = <_HomeAction>[
    _HomeAction('会员中心', Icons.workspace_premium_outlined, 'membership',
        Color(0xFFFEF3C7), Color(0xFFD97706)),
    _HomeAction('快速充值', Icons.bolt_outlined, 'recharge',
        Color(0xFFDCFCE7), Color(0xFF16A34A)),
    _HomeAction('API 密钥', Icons.vpn_key_outlined, 'apiKeys',
        Color(0xFFDBEAFE), Color(0xFF2563EB)),
    _HomeAction('用量账单', Icons.receipt_long_outlined, 'usage',
        Color(0xFFEDE9FE), Color(0xFF7C3AED)),
  ];

  static const List<_HomeService> _services = <_HomeService>[
    _HomeService('订单中心', Icons.shopping_bag_outlined, 'orders'),
    _HomeService('用量明细', Icons.bar_chart_outlined, 'usage'),
    _HomeService('优惠券', Icons.confirmation_number_outlined, 'coupons'),
    _HomeService('账单流水', Icons.receipt_outlined, 'ledger'),
    _HomeService('发票管理', Icons.description_outlined, 'invoices'),
    _HomeService('帮助中心', Icons.help_outline, 'help'),
    _HomeService('新闻动态', Icons.campaign_outlined, 'news'),
    _HomeService('会员中心', Icons.workspace_premium_outlined, 'membership'),
    _HomeService('模型与定价', Icons.memory_outlined, 'catalog'),
    _HomeService('更多服务', Icons.apps_outlined, 'more'),
  ];

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return SingleChildScrollView(
      padding: const EdgeInsets.fromLTRB(16, 16, 16, 96),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: <Widget>[
          _Hero(onNavigate: onNavigate),
          const SizedBox(height: 16),
          _PrimaryActions(
            actions: _primaryActions,
            onSelect: (destination) => _handleDestination(context, destination),
          ),
          const SizedBox(height: 16),
          _SectionCard(
            title: '全部服务',
            child: GridView.builder(
              shrinkWrap: true,
              physics: const NeverScrollableScrollPhysics(),
              itemCount: _services.length,
              gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                crossAxisCount: 5,
                mainAxisSpacing: 14,
                crossAxisSpacing: 6,
                childAspectRatio: 0.78,
              ),
              itemBuilder: (context, index) {
                final service = _services[index];
                return InkWell(
                  borderRadius: BorderRadius.circular(12),
                  onTap: () => _handleDestination(context, service.destination),
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: <Widget>[
                      Icon(service.icon, color: theme.colorScheme.onSurfaceVariant),
                      const SizedBox(height: 6),
                      Text(
                        service.label,
                        textAlign: TextAlign.center,
                        style: theme.textTheme.bodySmall,
                      ),
                    ],
                  ),
                );
              },
            ),
          ),
          const SizedBox(height: 16),
          _AnnouncementCard(
            onTap: () => _handleDestination(context, 'news'),
          ),
          const SizedBox(height: 12),
          _PromoCard(onTap: () => _handleDestination(context, 'recharge')),
          const SizedBox(height: 12),
          _ExperienceCard(
            onTap: () => _handleDestination(context, 'playground'),
          ),
          const SizedBox(height: 16),
          const _StatsRow(),
        ],
      ),
    );
  }

  void _handleDestination(BuildContext context, String destination) {
    switch (destination) {
      case 'usage':
      case 'apiKeys':
      case 'catalog':
      case 'profile':
      case 'playground':
      case 'membership':
      case 'recharge':
      case 'orders':
        onNavigate(destination);
      case 'help':
        _showNotice(context, '帮助中心', '如需帮助，请联系 SDKWork 支持。');
      case 'news':
        _showNotice(context, '新闻动态', '暂无新的平台公告。');
      case 'more':
        _showMore(context);
      default:
        _showNotice(context, '服务接入中', '该服务正在与当前端对齐，敬请期待。');
    }
  }

  void _showMore(BuildContext context) {
    showModalBottomSheet<void>(
      context: context,
      showDragHandle: true,
      builder: (sheetContext) => SafeArea(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: <Widget>[
            ListTile(
              leading: const Icon(Icons.workspace_premium_outlined),
              title: const Text('会员中心'),
              onTap: () {
                Navigator.of(sheetContext).pop();
                _showNotice(context, '会员中心', '会员权益正在与当前端对齐。');
              },
            ),
            ListTile(
              leading: const Icon(Icons.description_outlined),
              title: const Text('发票管理'),
              onTap: () {
                Navigator.of(sheetContext).pop();
                _showNotice(context, '发票管理', '发票服务正在与当前端对齐。');
              },
            ),
            ListTile(
              leading: const Icon(Icons.receipt_outlined),
              title: const Text('账单流水'),
              onTap: () {
                Navigator.of(sheetContext).pop();
                onNavigate('usage');
              },
            ),
            ListTile(
              leading: const Icon(Icons.settings_outlined),
              title: const Text('设置'),
              onTap: () {
                Navigator.of(sheetContext).pop();
                onNavigate('profile');
              },
            ),
          ],
        ),
      ),
    );
  }

  void _showNotice(BuildContext context, String title, String message) {
    showDialog<void>(
      context: context,
      builder: (dialogContext) => AlertDialog(
        title: Text(title),
        content: Text(message),
        actions: <Widget>[
          TextButton(
            onPressed: () => Navigator.of(dialogContext).pop(),
            child: const Text('知道了'),
          ),
        ],
      ),
    );
  }
}

class _Hero extends StatelessWidget {
  const _Hero({required this.onNavigate});

  final ValueChanged<String> onNavigate;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Container(
      decoration: BoxDecoration(
        color: theme.colorScheme.surface,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: theme.colorScheme.outline),
      ),
      padding: const EdgeInsets.fromLTRB(18, 18, 18, 18),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: <Widget>[
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
            decoration: BoxDecoration(
              color: theme.colorScheme.primary.withValues(alpha: 0.08),
              borderRadius: BorderRadius.circular(999),
            ),
            child: Row(
              mainAxisSize: MainAxisSize.min,
              children: <Widget>[
                Icon(
                  Icons.cloud_outlined,
                  size: 14,
                  color: theme.colorScheme.primary,
                ),
                const SizedBox(width: 5),
                Text(
                  'AI 云计算平台',
                  style: theme.textTheme.labelSmall?.copyWith(
                    color: theme.colorScheme.primary,
                    fontWeight: FontWeight.w600,
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 14),
          RichText(
            text: TextSpan(
              style: theme.textTheme.headlineSmall?.copyWith(
                fontWeight: FontWeight.w700,
                height: 1.25,
              ),
              children: <InlineSpan>[
                TextSpan(
                  text: '算力与模型，',
                  style: TextStyle(color: theme.colorScheme.onSurface),
                ),
                TextSpan(
                  text: '一站式上云',
                  style: TextStyle(color: theme.colorScheme.primary),
                ),
              ],
            ),
          ),
          const SizedBox(height: 8),
          Text(
            '会员、Token Bank 算力额度、模型路由与用量管理，一个应用全部搞定。',
            style: theme.textTheme.bodySmall?.copyWith(
              color: theme.colorScheme.onSurfaceVariant,
            ),
          ),
          const SizedBox(height: 16),
          TextField(
            onSubmitted: (_) => onNavigate('catalog'),
            decoration: InputDecoration(
              hintText: '搜索云产品、模型或订单',
              prefixIcon: const Icon(Icons.search),
              filled: true,
              fillColor: theme.brightness == Brightness.dark
                  ? const Color(0xFF0B1220)
                  : const Color(0xFFF8FAFC),
              isDense: true,
              border: OutlineInputBorder(
                borderRadius: BorderRadius.circular(12),
                borderSide: BorderSide(color: theme.colorScheme.outline),
              ),
              enabledBorder: OutlineInputBorder(
                borderRadius: BorderRadius.circular(12),
                borderSide: BorderSide(color: theme.colorScheme.outline),
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _PrimaryActions extends StatelessWidget {
  const _PrimaryActions({required this.actions, required this.onSelect});

  final List<_HomeAction> actions;
  final ValueChanged<String> onSelect;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Row(
      children: <Widget>[
        for (final action in actions)
          Expanded(
            child: InkWell(
              borderRadius: BorderRadius.circular(14),
              onTap: () => onSelect(action.destination),
              child: Padding(
                padding: const EdgeInsets.symmetric(vertical: 8),
                child: Column(
                  children: <Widget>[
                    Container(
                      width: 46,
                      height: 46,
                      decoration: BoxDecoration(
                        color: action.background,
                        borderRadius: BorderRadius.circular(14),
                      ),
                      child: Icon(
                        action.icon,
                        color: action.foreground,
                      ),
                    ),
                    const SizedBox(height: 6),
                    Text(
                      action.label,
                      style: theme.textTheme.bodySmall,
                      textAlign: TextAlign.center,
                    ),
                  ],
                ),
              ),
            ),
          ),
      ],
    );
  }
}

class _SectionCard extends StatelessWidget {
  const _SectionCard({required this.title, required this.child, this.action});

  final String title;
  final Widget child;
  final Widget? action;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Card(
      margin: EdgeInsets.zero,
      child: Padding(
        padding: const EdgeInsets.fromLTRB(16, 14, 16, 14),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: <Widget>[
            Row(
              children: <Widget>[
                Text(title, style: theme.textTheme.titleSmall),
                const Spacer(),
                if (action != null) action!,
              ],
            ),
            const SizedBox(height: 10),
            child,
          ],
        ),
      ),
    );
  }
}

class _AnnouncementCard extends StatelessWidget {
  const _AnnouncementCard({required this.onTap});

  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Card(
      margin: EdgeInsets.zero,
      child: ListTile(
        leading: Icon(Icons.campaign_outlined, color: theme.colorScheme.primary),
        title: const Text('新模型上线'),
        subtitle: const Text('统一路由自动选择更优通道，按量计费。'),
        trailing: const Icon(Icons.chevron_right),
        onTap: onTap,
      ),
    );
  }
}

class _PromoCard extends StatelessWidget {
  const _PromoCard({required this.onTap});

  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final dark = Theme.of(context).brightness == Brightness.dark;
    return Card(
      margin: EdgeInsets.zero,
      color: dark ? const Color(0xFF431407) : const Color(0xFFFFF7ED),
      child: ListTile(
        leading: Icon(
          Icons.bolt,
          color: dark ? const Color(0xFFFB923C) : const Color(0xFFEA580C),
        ),
        title: Text('首次充值赠体验金'),
        subtitle: const Text('新用户充值即享额外算力额度。'),
        trailing: const Icon(Icons.chevron_right),
        onTap: onTap,
      ),
    );
  }
}

class _ExperienceCard extends StatelessWidget {
  const _ExperienceCard({required this.onTap});

  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Card(
      margin: EdgeInsets.zero,
      child: ListTile(
        leading: Icon(Icons.auto_awesome_outlined, color: theme.colorScheme.primary),
        title: const Text('体验中心'),
        subtitle: const Text('与 AI 对话，快速体验模型能力。'),
        trailing: const Icon(Icons.chevron_right),
        onTap: onTap,
      ),
    );
  }
}

class _StatsRow extends StatelessWidget {
  const _StatsRow();

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    const stats = <(String, String)>[
      ('99.9%', '可用性'),
      ('24/7', '平台支持'),
      ('全球', '节点覆盖'),
    ];
    return Row(
      children: <Widget>[
        for (final stat in stats)
          Expanded(
            child: Column(
              children: <Widget>[
                Text(
                  stat.$1,
                  style: theme.textTheme.titleMedium?.copyWith(
                    fontWeight: FontWeight.w700,
                    color: theme.colorScheme.primary,
                  ),
                ),
                Text(stat.$2, style: theme.textTheme.bodySmall),
              ],
            ),
          ),
      ],
    );
  }
}

class _HomeAction {
  const _HomeAction(
    this.label,
    this.icon,
    this.destination,
    this.background,
    this.foreground,
  );

  final String label;
  final IconData icon;
  final String destination;
  final Color background;
  final Color foreground;
}

class _HomeService {
  const _HomeService(this.label, this.icon, this.destination);

  final String label;
  final IconData icon;
  final String destination;
}
