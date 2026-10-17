#!/usr/bin/env python3
"""Generate WeChat mini program tabBar icon pairs (outline + filled).

Output: src/images/tabbar/<glyph>-outline.png and <glyph>-filled.png at 81x81.
WeChat does not tint tabBar icons, so each file carries its own color:
outline = unselected slate-400 (#94a3b8), filled = selected sky-400 (#38bdf8).
Glyphs are designed in 0..100 logical units and scaled to the canvas, then
downscaled 4x -> 1x for antialiasing.
"""
import math
import os
from PIL import Image, ImageDraw

SIZE = 81
SCALE = 4
CANVAS = SIZE * SCALE

OUTLINE_COLOR = (148, 163, 184, 255)   # #94a3b8 slate-400 (unselected)
FILLED_COLOR = (56, 189, 248, 255)    # #38bdf8 sky-400 (selected)


def canvas() -> Image.Image:
    return Image.new("RGBA", (CANVAS, CANVAS), (0, 0, 0, 0))


def save(image: Image.Image, path: str) -> None:
    image.resize((SIZE, SIZE), Image.LANCZOS).save(path, "PNG", optimize=True)


class Pen:
    """Draws in 0..100 logical units onto the 81*4 canvas."""

    def __init__(self, draw: ImageDraw.ImageDraw, filled: bool) -> None:
        self.draw = draw
        self.filled = filled
        self.unit = CANVAS / 100.0

    def u(self, value: float) -> float:
        return value * self.unit

    def box(self, x: float, y: float, w: float, h: float) -> list[float]:
        return [self.u(x), self.u(y), self.u(x + w), self.u(y + h)]

    def color(self) -> tuple[int, int, int, int]:
        return FILLED_COLOR if self.filled else OUTLINE_COLOR

    def rounded(self, x: float, y: float, w: float, h: float, radius: float) -> None:
        if self.filled:
            self.draw.rounded_rectangle(self.box(x, y, w, h), radius=self.u(radius), fill=self.color())
        else:
            self.draw.rounded_rectangle(
                self.box(x, y, w, h), radius=self.u(radius), outline=self.color(), width=int(self.u(7))
            )

    def line(self, x1: float, y1: float, x2: float, y2: float, width: float = 7.0) -> None:
        self.draw.line(
            [self.u(x1), self.u(y1), self.u(x2), self.u(y2)],
            fill=self.color(),
            width=int(self.u(width)),
        )

    def ring(self, cx: float, cy: float, r: float, hole: float) -> None:
        if self.filled:
            self.draw.ellipse(
                [self.u(cx - r), self.u(cy - r), self.u(cx + r), self.u(cy + r)], fill=self.color()
            )
            self.draw.ellipse(
                [self.u(cx - hole), self.u(cy - hole), self.u(cx + hole), self.u(cy + hole)],
                fill=(0, 0, 0, 0),
            )
        else:
            self.draw.ellipse(
                [self.u(cx - r), self.u(cy - r), self.u(cx + r), self.u(cy + r)],
                outline=self.color(),
                width=int(self.u(7)),
            )


def dashboard(pen: Pen) -> None:
    # 2x2 rounded tile grid (lucide layout-dashboard).
    pad, gap = 16.0, 9.0
    cell = (100 - pad * 2 - gap) / 2
    for row in range(2):
        for column in range(2):
            pen.rounded(pad + column * (cell + gap), pad + row * (cell + gap), cell, cell, 7)


def usage(pen: Pen) -> None:
    # Receipt: document with zig-zag bottom edge and three text lines.
    left, right = 24.0, 76.0
    top, bottom = 14.0, 74.0
    teeth = 5
    step = (right - left) / teeth
    zig = 8.0
    points = [(left, top), (right, top), (right, bottom)]
    for index in range(teeth):
        x = right - step * index
        points.append((x - step / 2, bottom + (zig if index % 2 == 0 else -zig)))
        points.append((x - step, bottom))
    points.append((left, top))
    if pen.filled:
        pen.draw.polygon([(pen.u(x), pen.u(y)) for x, y in points], fill=pen.color())
        for offset in (34.0, 48.0, 62.0):
            pen.line(left + 8, offset, right - 8, offset, width=5)
    else:
        pen.draw.line(
            [(pen.u(x), pen.u(y)) for x, y in points + [points[0]]],
            fill=pen.color(),
            width=int(pen.u(7)),
            joint="curve",
        )
        for offset in (34.0, 48.0, 62.0):
            pen.line(left + 9, offset, right - 9, offset, width=5)


def api_keys(pen: Pen) -> None:
    # Key: ring on the upper left, shaft to the lower right with two teeth.
    cx, cy, ring_r, hole_r = 38.0, 38.0, 17.0, 7.0
    pen.ring(cx, cy, ring_r, hole_r)
    angle = math.radians(45)
    sx, sy = cx + ring_r * math.cos(angle) * 0.85, cy + ring_r * math.sin(angle) * 0.85
    ex, ey = 88.0, 88.0
    pen.line(sx, sy, ex, ey, width=8)
    dx, dy = ex - sx, ey - sy
    length = math.hypot(dx, dy)
    nx, ny = -dy / length, dx / length
    for t in (0.55, 0.78):
        bx, by = sx + dx * t, sy + dy * t
        pen.line(bx, by, bx + nx * 13, by + ny * 13, width=7)


def catalog(pen: Pen) -> None:
    # Bar chart: three ascending bars on a baseline.
    base = 82.0
    left, bar_w, gap = 18.0, 19.0, 11.0
    heights = [34.0, 56.0, 78.0]
    for index, height in enumerate(heights):
        x = left + index * (bar_w + gap)
        pen.rounded(x, base - height, bar_w, height, 4)
    axis_right = left + len(heights) * bar_w + (len(heights) - 1) * gap
    pen.line(left - 4, base + 5, axis_right + 4, base + 5, width=7)


GLYPHS = {
    "dashboard": dashboard,
    "usage": usage,
    "api-keys": api_keys,
    "catalog": catalog,
}


def main() -> None:
    app_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    out_dir = os.path.join(app_root, "src", "images", "tabbar")
    os.makedirs(out_dir, exist_ok=True)
    for name, painter in GLYPHS.items():
        for variant, filled in (("outline", False), ("filled", True)):
            image = canvas()
            painter(Pen(ImageDraw.Draw(image), filled))
            path = os.path.join(out_dir, f"{name}-{variant}.png")
            save(image, path)
            print(f"wrote {path} ({os.path.getsize(path)} bytes)")


if __name__ == "__main__":
    main()
