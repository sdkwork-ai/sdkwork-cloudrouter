import 'package:flutter_test/flutter_test.dart';
import 'package:sdkwork_cloudrouter_flutter_mobile_commons/sdkwork_cloudrouter_flutter_mobile_commons.dart';

void main() {
  group('defensive payload readers', () {
    test('readRecord walks candidate keys and falls back to the source', () {
      final source = <String, Object?>{
        'page': <String, Object?>{'pageSize': 20},
        'pagination': <String, Object?>{'pageSize': 50},
      };
      expect(readRecord(source, const ['pagination', 'page']), source['pagination']);
      expect(readRecord(source, const ['missing'])!['pageSize'], null);
      expect(readRecord('not-a-record', const ['page']), null);
    });

    test('readFiniteNumber reads numbers and parses numeric strings', () {
      final source = <String, Object?>{
        'count': 7,
        'text': '12.5',
        'broken': 'abc',
        'infinite': double.infinity,
      };
      expect(readFiniteNumber(source, const ['count']), 7);
      expect(readFiniteNumber(source, const ['text']), 12.5);
      expect(readFiniteNumber(source, const ['broken']), null);
      expect(readFiniteNumber(source, const ['infinite']), null);
      expect(readFiniteNumber(source, const ['absent']), null);
    });

    test('readNonEmptyString trims and rejects blank values', () {
      final source = <String, Object?>{
        'name': '  model  ',
        'blank': '   ',
        'number': 42,
      };
      expect(readNonEmptyString(source, const ['name']), 'model');
      expect(readNonEmptyString(source, const ['blank']), null);
      expect(readNonEmptyString(source, const ['number']), '42');
      expect(readNonEmptyString(source, const ['absent']), null);
    });

    test('readBoolean reads booleans and the string spellings', () {
      final source = <String, Object?>{
        'flag': true,
        'text': 'false',
        'other': 'yes',
      };
      expect(readBoolean(source, const ['flag']), isTrue);
      expect(readBoolean(source, const ['text']), isFalse);
      expect(readBoolean(source, const ['other']), null);
    });

    test('readCollection unwraps every SDKWork envelope shape', () {
      expect(readCollection(const [1, 2]), const [1, 2]);
      expect(
        readCollection(<String, Object?>{'records': const [1]}),
        const [1],
      );
      expect(
        readCollection(<String, Object?>{
          'data': <String, Object?>{'items': const [2]},
        }),
        const [2],
      );
      expect(readCollection(<String, Object?>{}), const <Object?>[]);
      expect(readCollection('scalar'), const <Object?>[]);
    });

    test('toRecord coerces any value', () {
      expect(toRecord(null), const <String, Object?>{});
      expect(toRecord('scalar'), const <String, Object?>{});
      expect(toRecord(<String, Object?>{'a': 1}), <String, Object?>{'a': 1});
    });
  });

  group('display formatters', () {
    test('formatTokenCount compacts thousands', () {
      expect(formatTokenCount(999, 'en-US'), '999');
      expect(formatTokenCount(1234, 'en-US'), '1.23K');
      expect(formatTokenCount(2500000, 'en-US'), '2.50M');
    });

    test('formatMinorUnitsAsCurrency renders cents as currency', () {
      expect(formatMinorUnitsAsCurrency(1234, 'CNY', 'zh-CN'), '¥12.34');
      expect(formatMinorUnitsAsCurrency(100, 'USD', 'en-US'), '\$1.00');
    });

    test('formatPercent renders two fraction digits', () {
      expect(formatPercent(0.1234, 'en-US'), '12.34%');
    });

    test('formatIsoTimestamp formats or returns null', () {
      expect(formatIsoTimestamp(null, 'en-US'), null);
      expect(formatIsoTimestamp('  ', 'en-US'), null);
      expect(
        formatIsoTimestamp('2026-10-16T09:30:00Z', 'en-US'),
        isA<String>(),
      );
    });

    test('maskApiKey keeps the first and last four characters', () {
      expect(maskApiKey('sk-abcdefghijklmnop'), 'sk-a********mnop');
      expect(maskApiKey('short'), '*****');
      expect(maskApiKey(''), '');
    });

    test('formatPricePerMillionTokens trims trailing zeros', () {
      expect(formatPricePerMillionTokens(0.5, 'CNY', 'zh-CN'), '¥0.5');
      expect(formatPricePerMillionTokens(12.3456789, 'CNY', 'zh-CN'), '¥12.3457');
      expect(formatPricePerMillionTokens(null, 'CNY', 'zh-CN'), null);
    });
  });

  group('locale helpers', () {
    test('normalizes language tags', () {
      expect(normalizeSdkworkCloudRouterLocale('zh-CN'), SdkworkCloudRouterLocale.zhCn);
      expect(normalizeSdkworkCloudRouterLocale('en-US'), SdkworkCloudRouterLocale.enUs);
      expect(normalizeSdkworkCloudRouterLocale('ja'), SdkworkCloudRouterLocale.enUs);
    });

    test('picks messages with a fallback', () {
      expect(
        pickSdkworkCloudRouterMessage(<String, String>{'k': 'v'}, 'k', 'f'),
        'v',
      );
      expect(
        pickSdkworkCloudRouterMessage(<String, String>{}, 'k', 'f'),
        'f',
      );
    });
  });
}
