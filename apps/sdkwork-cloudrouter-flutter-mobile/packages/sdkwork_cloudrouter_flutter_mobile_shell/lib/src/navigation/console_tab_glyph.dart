import 'package:flutter/material.dart';

/// Glyphs for the Cloud Router console tab bar.
///
/// Mirrors `CloudRouterConsoleTabGlyph` from
/// `@sdkwork/cloudrouter-contracts` (`CLOUDROUTER_CONSOLE_TABS`) and the same
/// four glyphs the mini program paints into its `iconPath` / `selectedIconPath`
/// pair, so the tab bar reads identically on every mobile root.
enum ConsoleTabGlyph { dashboard, receipt, key, barChart, profile, chat, playground }

/// Draws one console tab glyph in outline or filled form.
///
/// `APP_FLUTTER_UI_SPEC.md` section 5 forbids color-only selected states: the
/// unselected and selected destinations must be an outline/filled pair of the
/// same glyph, exactly like the mini program's icon pair.
class ConsoleTabGlyphIcon extends StatelessWidget {
  const ConsoleTabGlyphIcon(
    this.glyph, {
    required this.filled,
    this.color,
    this.size = 24,
    super.key,
  });

  final ConsoleTabGlyph glyph;
  final bool filled;

  /// Icon color; defaults to the console text ramp (muted outline, accent
  /// filled) so the pair matches the other mobile roots.
  final Color? color;
  final double size;

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      width: size,
      height: size,
      child: CustomPaint(
        painter: _ConsoleTabGlyphPainter(
          glyph: glyph,
          filled: filled,
          color: color ?? (filled ? const Color(0xFF2563EB) : const Color(0xFF64748B)),
        ),
      ),
    );
  }
}

class _ConsoleTabGlyphPainter extends CustomPainter {
  _ConsoleTabGlyphPainter({
    required this.glyph,
    required this.filled,
    required this.color,
  });

  final ConsoleTabGlyph glyph;
  final bool filled;
  final Color color;

  /// Stroke width in 0..100 logical units, scaled to the icon size.
  static const double _stroke = 7;

  @override
  void paint(Canvas canvas, Size size) {
    final scale = size.width / 100;
    canvas.save();
    canvas.scale(scale);
    final paint = Paint()
      ..color = color
      ..style = filled ? PaintingStyle.fill : PaintingStyle.stroke
      ..strokeWidth = _stroke
      ..strokeCap = StrokeCap.round
      ..strokeJoin = StrokeJoin.round;
    switch (glyph) {
      case ConsoleTabGlyph.dashboard:
        _paintDashboard(canvas, paint);
      case ConsoleTabGlyph.receipt:
        _paintReceipt(canvas, paint);
      case ConsoleTabGlyph.key:
        _paintKey(canvas, paint);
      case ConsoleTabGlyph.barChart:
        _paintBarChart(canvas, paint);
      case ConsoleTabGlyph.profile:
        _paintProfile(canvas, paint);
      case ConsoleTabGlyph.chat:
        _paintChat(canvas, paint);
      case ConsoleTabGlyph.playground:
        _paintPlayground(canvas, paint);
    }
    canvas.restore();
  }

  void _paintDashboard(Canvas canvas, Paint paint) {
    const cells = <Rect>[
      Rect.fromLTWH(14, 14, 32, 32),
      Rect.fromLTWH(54, 14, 32, 32),
      Rect.fromLTWH(14, 54, 32, 32),
      Rect.fromLTWH(54, 54, 32, 32),
    ];
    for (final cell in cells) {
      canvas.drawRRect(RRect.fromRectAndRadius(cell, const Radius.circular(7)), paint);
    }
  }

  void _paintReceipt(Canvas canvas, Paint paint) {
    final path = Path()
      ..moveTo(20, 12)
      ..lineTo(80, 12)
      ..lineTo(80, 78);
    const teeth = 5;
    for (var index = 0; index < teeth; index += 1) {
      final startX = 80 - (index * 60) / teeth;
      final midX = startX - 30 / teeth;
      final endX = startX - 60 / teeth;
      path
        ..lineTo(midX, 88)
        ..lineTo(endX, 78);
    }
    path.close();
    canvas.drawPath(path, paint);
  }

  void _paintKey(Canvas canvas, Paint paint) {
    // Ring on the left as an annulus so the filled variant keeps a hole.
    final ring = Path()
      ..addOval(const Rect.fromLTWH(14, 34, 32, 32))
      ..addOval(const Rect.fromLTWH(25, 45, 10, 10))
      ..fillType = PathFillType.evenOdd;
    canvas.drawPath(ring, paint);
    // Stem with two teeth pointing down-right.
    final stem = Path()
      ..moveTo(46, 44)
      ..lineTo(84, 44)
      ..lineTo(84, 54)
      ..lineTo(56, 54)
      ..lineTo(56, 66)
      ..lineTo(48, 66)
      ..lineTo(48, 54)
      ..lineTo(46, 54)
      ..close();
    canvas.drawPath(stem, paint);
  }

  void _paintBarChart(Canvas canvas, Paint paint) {
    final bars = <Rect>[
      Rect.fromLTWH(20, 62, 16, 22),
      Rect.fromLTWH(42, 42, 16, 42),
      Rect.fromLTWH(64, 24, 16, 60),
    ];
    for (final bar in bars) {
      canvas.drawRect(bar, paint);
    }
    final baseline = Rect.fromLTWH(16, 86, 68, 6);
    canvas.drawRect(baseline, paint);
  }

  void _paintProfile(Canvas canvas, Paint paint) {
    canvas.drawCircle(const Offset(50, 34), 18, paint);
    final body = Path()
      ..moveTo(18, 88)
      ..cubicTo(22, 62, 38, 58, 50, 58)
      ..cubicTo(62, 58, 78, 62, 82, 88)
      ..close();
    canvas.drawPath(body, paint);
  }

  void _paintChat(Canvas canvas, Paint paint) {
    final bubble = RRect.fromRectAndRadius(
      const Rect.fromLTWH(12, 18, 76, 50),
      const Radius.circular(14),
    );
    canvas.drawRRect(bubble, paint);
    final tail = Path()
      ..moveTo(30, 66)
      ..lineTo(30, 86)
      ..lineTo(50, 68)
      ..close();
    canvas.drawPath(tail, paint);
  }

  void _paintPlayground(Canvas canvas, Paint paint) {
    final star = Path()
      ..moveTo(50, 10)
      ..quadraticBezierTo(56, 42, 90, 50)
      ..quadraticBezierTo(56, 58, 50, 90)
      ..quadraticBezierTo(44, 58, 10, 50)
      ..quadraticBezierTo(44, 42, 50, 10)
      ..close();
    canvas.drawPath(star, paint);
  }

  @override
  bool shouldRepaint(_ConsoleTabGlyphPainter oldDelegate) {
    return oldDelegate.glyph != glyph || oldDelegate.filled != filled || oldDelegate.color != color;
  }
}
