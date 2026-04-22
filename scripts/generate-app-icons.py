#!/usr/bin/env python3
"""집밥노트 iOS, Android, 웹 앱 아이콘을 외부 의존성 없이 생성합니다."""

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
    src_alpha = sa / 255.0
    dst_alpha = buf[index + 3] / 255.0
    out_alpha = src_alpha + dst_alpha * (1.0 - src_alpha)

    if out_alpha <= 0:
        buf[index:index + 4] = b"\x00\x00\x00\x00"
        return

    inv = dst_alpha * (1.0 - src_alpha)
    buf[index] = clamp((sr * src_alpha + buf[index] * inv) / out_alpha)
    buf[index + 1] = clamp((sg * src_alpha + buf[index + 1] * inv) / out_alpha)
    buf[index + 2] = clamp((sb * src_alpha + buf[index + 2] * inv) / out_alpha)
    buf[index + 3] = clamp(out_alpha * 255)


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


def is_inside_rounded_rect(
    px: float,
    py: float,
    x0: float,
    y0: float,
    x1: float,
    y1: float,
    radii: tuple[float, float, float, float],
) -> bool:
    tl, tr, br, bl = radii
    if px < x0 or px > x1 or py < y0 or py > y1:
        return False

    corners = (
        (px < x0 + tl and py < y0 + tl, x0 + tl, y0 + tl, tl),
        (px > x1 - tr and py < y0 + tr, x1 - tr, y0 + tr, tr),
        (px > x1 - br and py > y1 - br, x1 - br, y1 - br, br),
        (px < x0 + bl and py > y1 - bl, x0 + bl, y1 - bl, bl),
    )
    for in_corner, cx, cy, radius in corners:
        if in_corner and radius > 0:
            return (px - cx) ** 2 + (py - cy) ** 2 <= radius * radius
    return True


def draw_rounded_rect_gradient(
    buf: bytearray,
    width: int,
    x0: float,
    y0: float,
    x1: float,
    y1: float,
    radii: tuple[float, float, float, float],
    top: tuple[int, int, int],
    bottom: tuple[int, int, int],
) -> None:
    height = len(buf) // (width * 4)
    left = max(0, math.floor(x0))
    right = min(width - 1, math.ceil(x1))
    top_y = max(0, math.floor(y0))
    bottom_y = min(height - 1, math.ceil(y1))
    for y in range(top_y, bottom_y + 1):
        t = (y + 0.5 - y0) / max(y1 - y0, 1)
        r = clamp(top[0] * (1 - t) + bottom[0] * t)
        g = clamp(top[1] * (1 - t) + bottom[1] * t)
        b = clamp(top[2] * (1 - t) + bottom[2] * t)
        color = (r, g, b, 255)
        for x in range(left, right + 1):
            if is_inside_rounded_rect(x + 0.5, y + 0.5, x0, y0, x1, y1, radii):
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


def draw_quadratic_line(
    buf: bytearray,
    width: int,
    x0: float,
    y0: float,
    cx: float,
    cy: float,
    x1: float,
    y1: float,
    stroke: float,
    color: tuple[int, int, int, int],
) -> None:
    prev_x = x0
    prev_y = y0
    for index in range(1, 28):
        t = index / 27
        inv = 1 - t
        x = inv * inv * x0 + 2 * inv * t * cx + t * t * x1
        y = inv * inv * y0 + 2 * inv * t * cy + t * t * y1
        draw_line(buf, width, prev_x, prev_y, x, y, stroke, color)
        prev_x = x
        prev_y = y
    draw_ellipse(buf, width, x0, y0, stroke / 2, stroke / 2, color)
    draw_ellipse(buf, width, x1, y1, stroke / 2, stroke / 2, color)


def draw_ellipse_clipped(
    buf: bytearray,
    width: int,
    cx: float,
    cy: float,
    rx: float,
    ry: float,
    min_y: float,
    max_y: float,
    color: tuple[int, int, int, int],
) -> None:
    left = max(0, math.floor(cx - rx))
    right = min(width - 1, math.ceil(cx + rx))
    height = len(buf) // (width * 4)
    top = max(0, math.floor(max(cy - ry, min_y)))
    bottom = min(height - 1, math.ceil(min(cy + ry, max_y)))
    for y in range(top, bottom + 1):
        dy = (y + 0.5 - cy) / ry
        for x in range(left, right + 1):
            dx = (x + 0.5 - cx) / rx
            if dx * dx + dy * dy <= 1.0:
                blend_pixel(buf, width, x, y, color)


def draw_leaf(buf: bytearray, width: int, scale: float) -> None:
    s = lambda value: value * scale
    cx = s(778)
    cy = s(236)
    half_length = s(82)
    half_width = s(48)
    angle = math.radians(-42)
    direction_x = math.cos(angle)
    direction_y = math.sin(angle)
    green = rgba("#7fa22a")

    left = max(0, math.floor(cx - half_length - half_width))
    right = min(width - 1, math.ceil(cx + half_length + half_width))
    height = len(buf) // (width * 4)
    top = max(0, math.floor(cy - half_length - half_width))
    bottom = min(height - 1, math.ceil(cy + half_length + half_width))

    for y in range(top, bottom + 1):
        for x in range(left, right + 1):
            dx = x + 0.5 - cx
            dy = y + 0.5 - cy
            u = (dx * direction_x + dy * direction_y) / half_length
            v = (-dx * direction_y + dy * direction_x) / half_width
            if -1 <= u <= 1:
                limit = max(0.0, 1.0 - u * u) ** 0.55
                if abs(v) <= limit:
                    blend_pixel(buf, width, x, y, green)

    # 잎맥은 원본 이미지처럼 크림색 짧은 곡선으로 넣습니다.
    draw_quadratic_line(buf, width, s(743), s(287), s(761), s(254), s(789), s(228), s(4), rgba("#fff7e8"))


def draw_rice_mound(buf: bytearray, width: int, scale: float, color: tuple[int, int, int, int]) -> None:
    s = lambda value: value * scale
    draw_rounded_rect(buf, width, s(407), s(632), s(617), s(678), s(22), color)
    for cx, cy, rx, ry in (
        (432, 632, 30, 30),
        (468, 610, 36, 34),
        (512, 598, 38, 34),
        (554, 611, 35, 34),
        (592, 634, 32, 31),
        (407, 655, 26, 26),
        (621, 655, 27, 27),
    ):
        draw_ellipse(buf, width, s(cx), s(cy), s(rx), s(ry), color)


def draw_icon(buf: bytearray, width: int, transparent: bool) -> None:
    height = len(buf) // (width * 4)
    scale = width / 1024.0
    s = lambda value: value * scale

    if not transparent:
        fill_gradient(buf, width, height, (255, 248, 235), (255, 246, 232))

    cream = rgba("#fff7e8")
    cream_shadow = rgba("#f7d9b8")
    orange_top = (255, 137, 49)
    orange_mid = (255, 118, 29)
    orange_bottom = (245, 82, 15)
    leg_orange = rgba("#d94a0c")

    draw_leaf(buf, width, scale)

    # 냉장고 다리는 본체 아래에서 살짝 보이도록 먼저 그립니다.
    draw_rounded_rect(buf, width, s(338), s(824), s(406), s(876), s(20), leg_orange)
    draw_rounded_rect(buf, width, s(618), s(824), s(686), s(876), s(20), leg_orange)

    # 첨부 이미지의 2단 냉장고 실루엣을 그대로 유지합니다.
    draw_rounded_rect_gradient(
        buf,
        width,
        s(292),
        s(210),
        s(732),
        s(428),
        (s(84), s(84), s(8), s(8)),
        orange_top,
        orange_mid,
    )
    draw_rounded_rect_gradient(
        buf,
        width,
        s(292),
        s(442),
        s(732),
        s(854),
        (s(8), s(8), s(88), s(88)),
        orange_mid,
        orange_bottom,
    )

    # 문 손잡이.
    draw_rounded_rect(buf, width, s(342), s(296), s(369), s(386), s(14), cream)
    draw_rounded_rect(buf, width, s(342), s(484), s(369), s(620), s(14), cream)

    # 밥 김.
    draw_quadratic_line(buf, width, s(471), s(562), s(459), s(543), s(471), s(524), s(18), cream)
    draw_quadratic_line(buf, width, s(512), s(542), s(499), s(520), s(516), s(502), s(20), cream)
    draw_quadratic_line(buf, width, s(557), s(562), s(545), s(543), s(557), s(524), s(18), cream)

    # 밥과 그릇.
    draw_rice_mound(buf, width, scale, cream)
    draw_ellipse_clipped(buf, width, s(512), s(660), s(118), s(108), s(660), s(775), cream)
    draw_ellipse(buf, width, s(512), s(660), s(120), s(10), cream_shadow)
    draw_ellipse(buf, width, s(512), s(656), s(118), s(8), cream)
    draw_rounded_rect(buf, width, s(464), s(756), s(560), s(788), s(12), cream)


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
    draw_icon(buf, canvas_size, transparent)
    final = downsample(buf, canvas_size, size)
    write_png(path, size, size, final, include_alpha=transparent)


def write_png(path: Path, width: int, height: int, rgba_bytes: bytearray, include_alpha: bool) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    rows = bytearray()
    stride = width * 4
    for y in range(height):
        rows.append(0)
        row = rgba_bytes[y * stride:(y + 1) * stride]
        if include_alpha:
            rows.extend(row)
        else:
            for x in range(width):
                index = x * 4
                rows.extend(row[index:index + 3])

    def chunk(kind: bytes, data: bytes) -> bytes:
        return struct.pack(">I", len(data)) + kind + data + struct.pack(">I", zlib.crc32(kind + data) & 0xFFFFFFFF)

    payload = b"\x89PNG\r\n\x1a\n"
    color_type = 6 if include_alpha else 2
    payload += chunk(b"IHDR", struct.pack(">IIBBBBB", width, height, 8, color_type, 0, 0, 0))
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

    web_sizes = {
        ROOT / "app/icon.png": 512,
        ROOT / "app/apple-icon.png": 180,
        ROOT / "public/icons/app-icon-192.png": 192,
        ROOT / "public/icons/app-icon-512.png": 512,
    }
    for path, size in web_sizes.items():
        make_png(path, size)

    print("Generated 집밥노트 app icons.")


if __name__ == "__main__":
    main()
