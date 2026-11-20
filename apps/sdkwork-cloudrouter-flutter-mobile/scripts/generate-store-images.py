#!/usr/bin/env python3
"""Generate the store and launcher image set for the Flutter mobile app.

Inputs (all repository-owned, no network):

- ``apps/sdkwork-cloudrouter-pc/public/apple-touch-icon.png``: the shipped
  brand mark (180 x 180, opaque plate). It is the same artwork the portal
  serves, so the store icon and every launcher icon are the product's real mark
  rather than a generated placeholder.
- ``assets/media/store/screenshots/ios/home.png``: a real UI capture produced by
  ``test/store_media_capture_test.dart``; used unchanged inside the marketing
  composites.

Outputs:

- ``assets/media/icons/app-icon-1024.png`` (catalog icon, opaque)
- ``assets/media/store/icons/apple/app-icon-1024.png``
- ``assets/media/store/icons/google/play-icon-512.png``
- ``assets/media/store/icons/huawei/app-icon-216.png``
- ``assets/media/covers/catalog-cover-1920x1080.png``
- ``assets/media/store/google/feature-graphic-1024x500.png``
- ``assets/media/store/harmony/app-icon-216.png`` (DevEco module icon)
- ``ios/Runner/Assets.xcassets/AppIcon.appiconset/*.png``
- ``android/app/src/main/res/mipmap-*/ic_launcher.png``

The brand mark is authored at 180 px. Upscaling edge-clamps the plate's colours
into the transparent/black margin first, which keeps the rounded plate clean and
lets the stores apply their own corner mask. The phone screens are never
upscaled: they come from the capture harness at the exact store pixel sizes.

Run from the application root:

    python scripts/generate-store-images.py
"""

from __future__ import annotations

import argparse
import re
from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter, ImageFont


BRAND_BLUE_TOP = (52, 132, 246)
BRAND_BLUE_BOTTOM = (23, 63, 196)
TEXT_PRIMARY = (245, 248, 255)
TEXT_MUTED = (188, 208, 246)


def load_brand_icon(repo_root: Path) -> Image.Image:
    """Return the brand plate as a full-bleed RGB square."""
    source = repo_root / "apps" / "sdkwork-cloudrouter-pc" / "public" / "apple-touch-icon.png"
    return _bleed_plate(Image.open(source).convert("RGBA"))


def _bleed_plate(plate: Image.Image) -> Image.Image:
    """Extend the plate's edge colours into its black margin.

    The source icon is a rounded plate on a black canvas. Stores apply their own
    rounded mask, so the canvas corners must become plate colour instead of
    black. Each row is clamped to its own plate edge and each remaining margin
    pixel is clamped to its column, which continues the plate's gradient with no
    averaging seams.
    """
    rgb = plate.convert("RGB")
    width, height = rgb.size
    pixels = rgb.load()
    plate = [[sum(pixels[x, y]) > 36 for y in range(height)] for x in range(width)]

    for y in range(height):
        xs = [x for x in range(width) if plate[x][y]]
        if not xs:
            continue
        left, right = xs[0], xs[-1]
        for x in range(left):
            pixels[x, y] = pixels[left, y]
        for x in range(right + 1, width):
            pixels[x, y] = pixels[right, y]

    for x in range(width):
        ys = [y for y in range(height) if plate[x][y]]
        if not ys:
            continue
        top, bottom = ys[0], ys[-1]
        for y in range(top):
            pixels[x, y] = pixels[x, top]
        for y in range(bottom + 1, height):
            pixels[x, y] = pixels[x, bottom]

    # The plate's anti-aliased rim leaks a one-pixel dark seam; smear the inner
    # colour outward so the store's rounded mask never reveals it.
    inset = 4
    for y in range(inset):
        for x in range(width):
            pixels[x, y] = pixels[x, inset]
    for y in range(height - inset, height):
        for x in range(width):
            pixels[x, y] = pixels[x, height - inset - 1]
    for x in range(inset):
        for y in range(height):
            pixels[x, y] = pixels[inset, y]
    for x in range(width - inset, width):
        for y in range(height):
            pixels[x, y] = pixels[width - inset - 1, y]

    return rgb


def squared(icon: Image.Image, size: int) -> Image.Image:
    return icon.resize((size, size), Image.Resampling.LANCZOS).convert("RGB")


def gradient(size: tuple[int, int]) -> Image.Image:
    width, height = size
    image = Image.new("RGB", size)
    pixels = image.load()
    for y in range(height):
        ratio = y / max(height - 1, 1)
        colour = tuple(
            round(BRAND_BLUE_TOP[channel] + (BRAND_BLUE_BOTTOM[channel] - BRAND_BLUE_TOP[channel]) * ratio)
            for channel in range(3)
        )
        for x in range(width):
            pixels[x, y] = colour
    return image


def load_font(app_root: Path, size: int) -> ImageFont.FreeTypeFont:
    candidates = [
        Path(r"C:\Windows\Fonts\Noto Sans SC (TrueType).otf"),
        Path(r"C:\Windows\Fonts\NotoSansSC-VF.ttf"),
        Path(r"C:\Windows\Fonts\msyh.ttc"),
        Path(r"C:\Windows\Fonts\simhei.ttf"),
        Path("/System/Library/Fonts/PingFang.ttc"),
        app_root / "assets" / "fonts" / "NotoSansSC-Regular.otf",
    ]
    for candidate in candidates:
        if candidate.exists():
            try:
                return ImageFont.truetype(str(candidate), size=size)
            except OSError:
                continue
    return ImageFont.load_default(size)


def rounded_phone(
    screenshot: Image.Image, target_height: int, radius: int = 42
) -> tuple[Image.Image, Image.Image]:
    scale = target_height / screenshot.height
    target_width = round(screenshot.width * scale)
    resized = screenshot.convert("RGB").resize(
        (target_width, target_height), Image.Resampling.LANCZOS
    )
    mask = Image.new("L", (target_width, target_height), 0)
    ImageDraw.Draw(mask).rounded_rectangle(
        (0, 0, target_width - 1, target_height - 1), radius=radius, fill=255
    )
    return resized, mask


def compose_cover(app_root: Path, brand: Image.Image) -> None:
    size = (1920, 1080)
    canvas = gradient(size)
    glow = Image.new("RGB", size, (0, 0, 0))
    ImageDraw.Draw(glow).ellipse((900, 80, 2100, 1250), fill=(64, 126, 255))
    canvas = Image.blend(canvas, glow, 0.18)
    draw = ImageDraw.Draw(canvas)

    title_font = load_font(app_root, 92)
    subtitle_font = load_font(app_root, 54)
    tag_font = load_font(app_root, 40)
    draw.text((120, 300), "SDKWork CloudRouter", font=title_font, fill=TEXT_PRIMARY)
    draw.text((124, 440), "算力与模型，一站式上云", font=subtitle_font, fill=TEXT_PRIMARY)
    draw.text(
        (124, 540),
        "会员 · Token Bank 算力额度 · 模型路由与用量管理",
        font=tag_font,
        fill=TEXT_MUTED,
    )
    canvas.paste(squared(brand, 128), (124, 132))

    screenshot = Image.open(
        app_root / "assets" / "media" / "store" / "screenshots" / "ios" / "home.png"
    )
    phone, mask = rounded_phone(screenshot, 900)
    shadow = Image.new("RGBA", (phone.width + 120, phone.height + 120), (0, 0, 0, 0))
    shadow_mask = Image.new("L", shadow.size, 0)
    ImageDraw.Draw(shadow_mask).rounded_rectangle(
        (60, 60, shadow.width - 60, shadow.height - 60), radius=52, fill=120
    )
    shadow = Image.composite(Image.new("RGBA", shadow.size, (5, 20, 60, 255)), shadow, shadow_mask)
    shadow = shadow.filter(ImageFilter.GaussianBlur(42))
    canvas.paste(shadow, (1290, 90), shadow)
    canvas.paste(phone, (1350, 150), mask)

    output = app_root / "assets" / "media" / "covers" / "catalog-cover-1920x1080.png"
    output.parent.mkdir(parents=True, exist_ok=True)
    canvas.save(output)


def compose_feature_graphic(app_root: Path, brand: Image.Image) -> None:
    size = (1024, 500)
    canvas = gradient(size)
    draw = ImageDraw.Draw(canvas)
    draw.text((64, 150), "CloudRouter", font=load_font(app_root, 66), fill=TEXT_PRIMARY)
    draw.text(
        (66, 236),
        "算力与模型，一站式上云",
        font=load_font(app_root, 34),
        fill=TEXT_MUTED,
    )
    canvas.paste(squared(brand, 84), (64, 48))

    screenshot = Image.open(
        app_root / "assets" / "media" / "store" / "screenshots" / "android" / "home.png"
    )
    phone, mask = rounded_phone(screenshot, 560)
    canvas.paste(phone, (660, 70), mask)

    output = app_root / "assets" / "media" / "store" / "google" / "feature-graphic-1024x500.png"
    output.parent.mkdir(parents=True, exist_ok=True)
    canvas.save(output)


def flatten_store_screenshots(app_root: Path) -> None:
    """Strip the alpha channel the Flutter PNG encoder always writes.

    Apple and Google reject store screenshots that carry alpha, and the capture
    harness can only encode RGBA. Every pixel is opaque, so dropping the channel
    is lossless; the manifest's store-tagged entries then match the profile.
    """
    root = app_root / "assets" / "media" / "store" / "screenshots"
    for shelf in ("ios", "android", "harmony", "mobile"):
        for image_path in sorted((root / shelf).glob("*.png")):
            image = Image.open(image_path).convert("RGBA")
            background = Image.new("RGB", image.size, (247, 249, 255))
            background.paste(image, mask=image.getchannel("A"))
            background.save(image_path, format="PNG", optimize=True)


def write_store_icons(app_root: Path, brand: Image.Image) -> None:
    targets = [
        (app_root / "assets" / "media" / "icons" / "app-icon-1024.png", 1024),
        (app_root / "assets" / "media" / "store" / "icons" / "apple" / "app-icon-1024.png", 1024),
        (app_root / "assets" / "media" / "store" / "icons" / "google" / "play-icon-512.png", 512),
        (app_root / "assets" / "media" / "store" / "icons" / "huawei" / "app-icon-216.png", 216),
        (app_root / "assets" / "media" / "store" / "harmony" / "app-icon-216.png", 216),
    ]
    for path, size in targets:
        path.parent.mkdir(parents=True, exist_ok=True)
        squared(brand, size).save(path, format="PNG", optimize=True)


def write_launcher_icons(app_root: Path, brand: Image.Image) -> None:
    app_icon_set = app_root / "ios" / "Runner" / "Assets.xcassets" / "AppIcon.appiconset"
    pattern = re.compile(r"Icon-App-([0-9.]+)x([0-9.]+)@([0-9.]+)x\.png$")
    for image_path in app_icon_set.glob("Icon-App-*.png"):
        match = pattern.match(image_path.name)
        if not match:
            continue
        logical = float(match.group(1))
        scale = float(match.group(3))
        squared(brand, round(logical * scale)).save(image_path, format="PNG", optimize=True)

    android_res = app_root / "android" / "app" / "src" / "main" / "res"
    for density, pixels in {
        "mipmap-mdpi": 48,
        "mipmap-hdpi": 72,
        "mipmap-xhdpi": 96,
        "mipmap-xxhdpi": 144,
        "mipmap-xxxhdpi": 192,
    }.items():
        target = android_res / density / "ic_launcher.png"
        if target.exists():
            squared(brand, pixels).save(target, format="PNG", optimize=True)


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--app-root",
        default=str(Path(__file__).resolve().parent.parent),
        help="Flutter application root (default: parent of scripts/)",
    )
    parser.add_argument(
        "--repo-root",
        default=str(Path(__file__).resolve().parent.parent.parent.parent),
        help="SDKWork workspace root that owns the PC portal brand assets",
    )
    args = parser.parse_args()
    app_root = Path(args.app_root).resolve()
    repo_root = Path(args.repo_root).resolve()

    brand = load_brand_icon(repo_root)
    flatten_store_screenshots(app_root)
    write_store_icons(app_root, brand)
    write_launcher_icons(app_root, brand)
    compose_cover(app_root, brand)
    compose_feature_graphic(app_root, brand)
    print("store and launcher images generated")


if __name__ == "__main__":
    main()
