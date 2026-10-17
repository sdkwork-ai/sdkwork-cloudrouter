/// Locale-aware display formatters shared by the console capability packages.
///
/// These mirror `sdkwork-cloudrouter-service/src/format/units.ts` so the
/// Flutter root renders the same numbers as the PC, H5, and mini-program roots.
library;

const List<String> _tokenUnits = <String>['', 'K', 'M', 'B'];

/// Compacts a token count (1234 -> "1.23K").
String formatTokenCount(num value, String locale) {
  if (!value.isFinite) return '0';
  var scaled = value.abs();
  var unit = 0;
  while (scaled >= 1000 && unit < _tokenUnits.length - 1) {
    scaled /= 1000;
    unit += 1;
  }
  final digits = unit == 0 ? 0 : 2;
  final formatted = _formatNumber(value < 0 ? -scaled : scaled, locale, digits);
  return '$formatted${_tokenUnits[unit]}';
}

/// Formats minor currency units (cents) as a currency string.
String formatMinorUnitsAsCurrency(num minorUnits, String currency, String locale) {
  final safe = minorUnits.isFinite ? minorUnits : 0;
  return '${_currencySymbol(currency)}${_formatNumber(safe / 100, locale, 2)}';
}

/// Masks an API key for display, mirroring `maskApiKey` from
/// `sdkwork-cloudrouter-service/src/format/units.ts`.
String maskApiKey(String raw) {
  final trimmed = raw.trim();
  if (trimmed.isEmpty) return '';
  if (trimmed.length <= 8) return '*' * trimmed.length;
  return '${trimmed.substring(0, 4)}${'*' * 8}${trimmed.substring(trimmed.length - 4)}';
}

/// Formats a per-million-token price with at most four fraction digits;
/// returns null when the price is absent.
///
/// Mirrors the `Intl.NumberFormat` currency formatting the browser roots apply
/// to `ConsoleCatalogRateRow` prices.
String? formatPricePerMillionTokens(double? value, String currency, String locale) {
  if (value == null || !value.isFinite) return null;
  final fixed = _formatNumber(value, locale, 4);
  final trimmed = fixed.contains('.') ? fixed.replaceFirst(RegExp(r'0+$'), '').replaceFirst(RegExp(r'\.$'), '') : fixed;
  return '${_currencySymbol(currency)}$trimmed';
}

/// Formats a 0..1 ratio as a percentage with two fraction digits.
String formatPercent(num ratio, String locale) {
  final safe = ratio.isFinite ? ratio : 0;
  return '${_formatNumber(safe * 100, locale, 2)}%';
}

/// Formats an ISO-8601 timestamp; returns null when absent or unparseable.
String? formatIsoTimestamp(String? value, String locale) {
  if (value == null || value.trim().isEmpty) return null;
  final parsed = DateTime.tryParse(value.trim());
  if (parsed == null) return value;
  final local = parsed.toLocal();
  final date = '${_twoDigits(local.year)}-${_twoDigits(local.month)}-${_twoDigits(local.day)}';
  final time = '${_twoDigits(local.hour)}:${_twoDigits(local.minute)}';
  return '$date $time';
}

String _formatNumber(num value, String locale, int fractionDigits) {
  final fixed = value.toStringAsFixed(fractionDigits);
  final negative = fixed.startsWith('-');
  final absolute = negative ? fixed.substring(1) : fixed;
  final parts = absolute.split('.');
  final whole = _groupThousands(parts[0], locale == 'zh-CN' ? '' : ',');
  final fraction = parts.length > 1 ? '.${parts[1]}' : '';
  return '${negative ? '-' : ''}$whole$fraction';
}

String _groupThousands(String digits, String separator) {
  if (separator.isEmpty) return digits;
  final buffer = StringBuffer();
  for (var index = 0; index < digits.length; index += 1) {
    if (index > 0 && (digits.length - index) % 3 == 0) buffer.write(separator);
    buffer.write(digits[index]);
  }
  return buffer.toString();
}

String _currencySymbol(String currency) {
  switch (currency.toUpperCase()) {
    case 'CNY':
    case 'RMB':
      return '¥';
    case 'USD':
      return '\$';
    case 'EUR':
      return '€';
    default:
      return '$currency ';
  }
}

String _twoDigits(int value) => value.toString().padLeft(2, '0');
