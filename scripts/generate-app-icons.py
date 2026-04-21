#!/usr/bin/env python3
"""Generate 집밥노트 iOS and Android launcher icons without external dependencies."""

from __future__ import annotations

import math
import os
import struct
import zlib
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]


def clamp(value: float) -> int:
    return max(0, min(255, int(round(value))))


def rgba(hex_color: str, alpha: int = 255) -> tuple[int, int, int, int]:
    value = hex_color.lstrip("#")
    return int(value[0:2], 16), int(value[2:4], 16), int(value[4:6], 16), alpha


def blend_pixel(buf: bytearray, width: int, x: int, y: int, color: tuple[int, int, int, int]) -> None:
    if x < 0 or y < 0 or x >= width:
        return
    index = (y * width + x) * 4
    if index < 0 or index + 3 >= len(buf):
        return

    sr, sg, sb, sa = color
    alpha = sa / 255.0
    inv = 1.0 - alpha
    buf[index] = clamp(sr * alpha + buf[index] * inv)
    buf[index + 1] = clamp(sg * alpha + buf[index + 1] * inv)
    buf[index + 2] = clamp(sb * alpha + buf[index + 2] * inv)
    buf[index + 3] = clamp(255 * alpha + buf[index + 3] * inv)


def fill_gradient(buf: bytearray, width: int, height: int, top: tuple[int, int, int], bottom: tuple[int, int, int]) -> None:
    for y in range(height):
        t = y / max(height - 1, 1)
        r = clamp(top[0] * (1 - t) + bottom[0] * t)
        g = clamp(top[1] * (1 - t) + bottom[1] * t)
        b = clamp(top[2] * (1 - t) + bottom[2] * t)
        row = y * width * 4
        for x in range(width):
            index = row + x * 4
            buf[index:index + 4] = bytes((r, g, b, 255))


def draw_ellipse(buf: bytearray, width: int, cx: float, cy: float, rx: float, ry: float, color: tuple[int, int, int, int]) -> None:
    left = max(0, math.floor(cx - rx))
    right = min(width - 1, math.ceil(cx + rx))
    height = len(buf) // (width * 4)
    top = max(0, math.floor(cy - ry))
    bottom = min(height - 1, math.ceil(cy + ry))
    for y in range(top, bottom + 1):
        dy = (y + 0.5 - cy) / ry
        for x in range(left, right + 1):
            dx = (x + 0.5 - cx) / rx
            if dx * dx + dy * dy <= 1.0:
                blend_pixel(buf, width, x, y, color)


def draw_rounded_rect(buf: bytearray, width: int, x0: float, y0: float, x1: float, y1: float, radius: float, color: tuple[int, int, int, int]) -> None:
    height = len(buf) // (width * 4)
    left = max(0, math.floor(x0))
    right = min(width - 1, math.ceil(x1))
    top = max(0, math.floor(y0))
    bottom = min(height - 1, math.ceil(y1))
    for y in range(top, bottom + 1):
        for x in range(left, right + 1):
            px = x + 0.5
            py = y + 0.5
            dx = max(x0 + radius - px, 0, px - (x1 - radius))
            dy = max(y0 + radius - py, 0, py - (y1 - radius))
            if dx * dx + dy * dy <= radius * radius:
                blend_pixel(buf, width, x, y, color)


def draw_line(buf: bytearray, width: int, x0: float, y0: float, x1: float, y1: float, stroke: float, color: tuple[int, int, int, int]) -> None:
    height = len(buf) // (width * 4)
    half = stroke / 2
    left = max(0, math.floor(min(x0, x1) - half - 2))
    right = min(width - 1, math.ceil(max(x0, x1) + half + 2))
    top = max(0, math.floor(min(y0, y1) - half - 2))
    bottom = min(height - 1, math.ceil(max(y0, y1) + half + 2))
    vx = x1 - x0
    vy = y1 - y0
    length_sq = max(vx * vx + vy * vy, 1)
    for y in range(top, bottom + 1):
        for x in range(left, right + 1):
            px = x + 0.5
            py = y + 0.5
            t = max(0.0, min(1.0, ((px - x0) * vx + (py - y0) * vy) / length_sq))
            nx = x0 + t * vx
            ny = y0 + t * vy
            if (px - nx) ** 2 + (py - ny) ** 2 <= half * half:
                blend_pixel(buf, width, x, y, color)


def draw_icon(buf: bytearray, width: int, transparent: bool) -> None:
    height = len(buf) // (width * 4)
    scale = width / 1024.0
    s = lambda value: value * scale

    if not transparent:
        fill_gradient(buf, width, height, (255, 124, 49), (225, 74, 24))
        draw_ellipse(buf, width, s(512), s(540), s(372), s(372), rgba("#ffffff", 30))

    cream = rgba("#fff7e8")
    cream_shadow = rgba("#f4d7b8")
    brown = rgba("#5b321d")

    # House roof.
    draw_line(buf, width, s(350), s(420), s(512), s(286), s(58), cream)
    draw_line(buf, width, s(512), s(286), s(674), s(420), s(58), cream)
    draw_line(buf, width, s(606), s(310), s(606), s(384), s(42), cream)

    # Rice bowl and plate.
    draw_ellipse(buf, width, s(512), s(612), s(282), s(128), cream_shadow)
    draw_ellipse(buf, width, s(512), s(575), s(255), s(120), cream)
    draw_rounded_rect(buf, width, s(310), s(586), s(714), s(742), s(78), cream)
    draw_ellipse(buf, width, s(512), s(742), s(188), s(44), brown)
    draw_ellipse(buf, width, s(512), s(722), s(166), s(34), rgba("#7a4427"))

    # Steam.
    draw_line(buf, width, s(430), s(502), s(404), s(452), s(28), rgba("#ffffff", 210))
    draw_line(buf, width, s(512), s(500), s(512), s(440), s(28), rgba("#ffffff", 230))
    draw_line(buf, width, s(594), s(502), s(620), s(452), s(28), rgba("#ffffff", 210))


def downsample(buf: bytearray, src_size: int, dst_size: int) -> bytearray:
    if src_size == dst_size:
        return buf
    factor = src_size // dst_size
    out = bytearray(dst_size * dst_size * 4)
    for y in range(dst_size):
        for x in range(dst_size):
            total = [0, 0, 0, 0]
            for yy in range(factor):
                for xx in range(factor):
                    index = ((y * factor + yy) * src_size + (x * factor + xx)) * 4
                    total[0] += buf[index]
                    total[1] += buf[index + 1]
                    total[2] += buf[index + 2]
                    total[3] += buf[index + 3]
            count = factor * factor
            target = (y * dst_size + x) * 4
            out[target:target + 4] = bytes(clamp(channel / count) for channel in total)
    return out


def make_png(path: Path, size: int, transparent: bool = False) -> None:
    factor = 2 if size >= 512 else 4
    canvas_size = size * factor
    buf = bytearray(canvas_size * canvas_size * 4)
    if not transparent:
        fill_gradient(buf, canvas_size, canvas_size, (255, 124, 49), (225, 74, 24))
    draw_icon(buf, canvas_size, transparent)
    final = downsample(buf, canvas_size, size)
    write_png(path, size, size, final)


def write_png(path: Path, width: int, height: int, rgba_bytes: bytearray) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    rows = bytearray()
    stride = width * 4
    for y in range(height):
        rows.append(0)
        rows.extend(rgba_bytes[y * stride:(y + 1) * stride])

    def chunk(kind: bytes, data: bytes) -> bytes:
        return struct.pack(">I", len(data)) + kind + data + struct.pack(">I", zlib.crc32(kind + data) & 0xFFFFFFFF)

    payload = b"\x89PNG\r\n\x1a\n"
    payload += chunk(b"IHDR", struct.pack(">IIBBBBB", width, height, 8, 6, 0, 0, 0))
    payload += chunk(b"IDAT", zlib.compress(bytes(rows), 9))
    payload += chunk(b"IEND", b"")
    path.write_bytes(payload)


def main() -> None:
    ios_dir = ROOT / "ios/App/App/Assets.xcassets/AppIcon.appiconset"
    ios_sizes = {
        "AppIcon-20@2x.png": 40,
        "AppIcon-20@3x.png": 60,
        "AppIcon-29@2x.png": 58,
        "AppIcon-29@3x.png": 87,
        "AppIcon-40@2x.png": 80,
        "AppIcon-40@3x.png": 120,
        "AppIcon-60@2x.png": 120,
        "AppIcon-60@3x.png": 180,
        "AppIcon-76@1x.png": 76,
        "AppIcon-76@2x.png": 152,
        "AppIcon-83.5@2x.png": 167,
        "AppIcon-1024@1x.png": 1024,
        "AppIcon-512@2x.png": 1024,
    }
    for filename, size in ios_sizes.items():
        make_png(ios_dir / filename, size)

    android_sizes = {
        "mipmap-mdpi": (48, 108),
        "mipmap-hdpi": (72, 162),
        "mipmap-xhdpi": (96, 216),
        "mipmap-xxhdpi": (144, 324),
        "mipmap-xxxhdpi": (192, 432),
    }
    res_dir = ROOT / "android/app/src/main/res"
    for folder, (icon_size, foreground_size) in android_sizes.items():
        target = res_dir / folder
        make_png(target / "ic_launcher.png", icon_size)
        make_png(target / "ic_launcher_round.png", icon_size)
        make_png(target / "ic_launcher_foreground.png", foreground_size, transparent=True)

    print("Generated 집밥노트 app icons.")


if __name__ == "__main__":
    main()
