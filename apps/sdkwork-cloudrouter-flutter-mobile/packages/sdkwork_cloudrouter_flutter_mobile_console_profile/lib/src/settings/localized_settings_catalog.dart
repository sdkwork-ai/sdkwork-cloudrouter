import 'package:sdkwork_settings_flutter/sdkwork_settings_flutter.dart';

/// Chinese copy for the four CloudRouter settings sections.
///
/// The catalog *definition* stays owned by `sdkwork_settings_flutter`; this layer
/// only projects the shared defaults into the CloudRouter locale, so no setting
/// ID, default, or validator is duplicated.
class _SettingsCopy {
  const _SettingsCopy(this.title, this.description, [this.options = const {}]);

  final String title;
  final String description;
  final Map<Object, String> options;
}

const Set<String> cloudRouterSettingsSectionIds = <String>{
  'appearance',
  'voice',
  'notifications',
  'about',
};

const Map<String, _SettingsCopy> _sectionCopy = <String, _SettingsCopy>{
  'appearance': _SettingsCopy('外观', '主题、字体大小与显示密度。'),
  'voice': _SettingsCopy('语音', '语音播报、音色与语速。'),
  'notifications': _SettingsCopy('通知', '选择接收哪些更新以及接收方式。'),
  'about': _SettingsCopy('关于', '版本信息、服务条款与隐私政策。'),
};

const Map<String, _SettingsCopy> _groupCopy = <String, _SettingsCopy>{
  'general': _SettingsCopy('通用', ''),
  'notifications': _SettingsCopy('通知', ''),
  'about': _SettingsCopy('关于', ''),
};

const Map<String, _SettingsCopy> _settingCopy = <String, _SettingsCopy>{
  'appearance.theme': _SettingsCopy(
    '主题',
    '跟随系统或选择固定外观。',
    <Object, String>{'system': '跟随系统', 'light': '浅色', 'dark': '深色'},
  ),
  'appearance.font-size': _SettingsCopy(
    '字体大小',
    '调整界面基础文字大小。',
    <Object, String>{'small': '小', 'medium': '中', 'large': '大'},
  ),
  'appearance.density': _SettingsCopy(
    '显示密度',
    '紧凑模式可在一屏显示更多内容。',
    <Object, String>{'comfortable': '舒适', 'compact': '紧凑'},
  ),
  'appearance.reduce-motion': _SettingsCopy('减少动画', '尽量减少非必要动画。'),
  'voice.enabled': _SettingsCopy('语音播报', '启用助手语音播放与语音交互。'),
  'voice.speaker': _SettingsCopy(
    '语音音色',
    '选择播放时使用的音色。',
    <Object, String>{'system': '系统默认', 'female': '女声', 'male': '男声'},
  ),
  'voice.rate': _SettingsCopy('语速', '调整语音播放速度。'),
  'notifications.enabled': _SettingsCopy('通知', '接收账户与产品更新。'),
  'notifications.sound': _SettingsCopy('提示音', '新通知播放提示音。'),
  'notifications.preview': _SettingsCopy('消息预览', '在通知预览中显示内容。'),
  'about.version': _SettingsCopy('版本', '已安装应用版本。'),
  'about.terms': _SettingsCopy('服务条款', '阅读管理本应用的条款。'),
  'about.privacy': _SettingsCopy('隐私政策', '阅读隐私政策。'),
};

/// Shared settings catalog filtered and localized for CloudRouter.
SdkworkSettingsCatalog createCloudRouterSettingsCatalog() {
  final defaults = SdkworkSettingsCatalog.defaults();
  final sections = defaults.sections
      .where((section) => cloudRouterSettingsSectionIds.contains(section.id))
      .map((section) {
    final copy = _sectionCopy[section.id];
    return copy == null
        ? section
        : section.copyWith(title: copy.title, description: copy.description);
  }).toList(growable: false);
  final sectionIds = sections.map((section) => section.id).toSet();
  final settings = defaults.settings
      .where((setting) => sectionIds.contains(setting.sectionId))
      .map((setting) {
    final copy = _settingCopy[setting.id];
    if (copy == null) return setting;
    return setting.copyWith(
      title: copy.title,
      description: copy.description,
      options: setting.options
          .map((option) => option.copyWith(
                label: copy.options[option.value] ?? option.label,
              ))
          .toList(growable: false),
    );
  }).toList(growable: false);
  final groupIds = sections.map((section) => section.groupId).toSet();
  final groups = defaults.groups
      .where((group) => groupIds.contains(group.id))
      .map((group) {
    final copy = _groupCopy[group.id];
    return copy == null ? group : group.copyWith(title: copy.title);
  }).toList(growable: false);
  return SdkworkSettingsCatalog(
    groups: groups,
    sections: sections,
    settings: settings,
  );
}
