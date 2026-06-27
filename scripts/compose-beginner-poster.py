#!/usr/bin/env python3
from __future__ import annotations

import argparse
import json
import os
import subprocess
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont, ImageOps


WIDTH = 1024
HEIGHT = 1536
FONT_CANDIDATES = [
    "/System/Library/Fonts/AppleSDGothicNeo.ttc",
    "/System/Library/Fonts/Supplemental/AppleGothic.ttf",
]


def pick_font_path() -> str:
    for candidate in FONT_CANDIDATES:
        if Path(candidate).exists():
            return candidate
    return ""


FONT_PATH = pick_font_path()


def font(size: int) -> ImageFont.FreeTypeFont | ImageFont.ImageFont:
    if FONT_PATH:
        return ImageFont.truetype(FONT_PATH, size=size)
    return ImageFont.load_default()


def text_width(draw: ImageDraw.ImageDraw, text: str, face: ImageFont.ImageFont) -> int:
    box = draw.textbbox((0, 0), text, font=face)
    return box[2] - box[0]


def fit_font(
    draw: ImageDraw.ImageDraw,
    text: str,
    max_width: int,
    max_size: int,
    min_size: int,
) -> ImageFont.ImageFont:
    for size in range(max_size, min_size - 1, -2):
        candidate = font(size)
        if text_width(draw, text, candidate) <= max_width:
            return candidate
    return font(min_size)


def wrap_text(
    draw: ImageDraw.ImageDraw,
    text: str,
    face: ImageFont.ImageFont,
    max_width: int,
) -> list[str]:
    words = text.split()
    if len(words) <= 1:
        lines: list[str] = []
        current = ""
        for char in text:
            if text_width(draw, current + char, face) <= max_width:
                current += char
            else:
                if current:
                    lines.append(current)
                current = char
        if current:
            lines.append(current)
        return lines

    lines = []
    current = ""
    for word in words:
        next_line = word if not current else f"{current} {word}"
        if text_width(draw, next_line, face) <= max_width:
            current = next_line
        else:
            if current:
                lines.append(current)
            current = word
    if current:
        lines.append(current)
    return lines


def normalize_amount(name: str, amount: str, required: bool) -> str:
    value = amount
    if name == "물" and amount == "2컵":
        value = "360ml(종이컵 2컵)"
    elif amount == "1큰술":
        value = "1큰술(15ml)"
    elif amount == "1작은술":
        value = "1작은술(5ml)"
    if not required:
        value = f"{value}, 선택"
    return value


def load_recipe(project_root: Path, slug: str) -> dict:
    code = "\n".join(
        [
            "import { BEGINNER_RECIPE_LIBRARY } from './lib/beginner-recipes.ts';",
            "const slug = process.env.POSTER_SLUG;",
            "const recipe = BEGINNER_RECIPE_LIBRARY.find((item) => item.slug === slug);",
            "if (!recipe) { throw new Error(`Unknown recipe slug: ${slug}`); }",
            "console.log(JSON.stringify({",
            "  slug: recipe.slug,",
            "  title: recipe.title,",
            "  subtitle: recipe.oneLineDescription,",
            "  tools: recipe.requiredTools,",
            "  ingredients: recipe.ingredients,",
            "  steps: recipe.steps.slice(0, 4).map((step) => ({",
            "    title: step.title,",
            "    action: step.action,",
            "    visualCue: step.visualCue,",
            "  })),",
            "}));",
        ]
    )
    env = os.environ.copy()
    env["POSTER_SLUG"] = slug
    result = subprocess.run(
        ["node", "--experimental-strip-types", "--input-type=module", "-e", code],
        cwd=project_root,
        env=env,
        text=True,
        capture_output=True,
        check=True,
    )
    return json.loads(result.stdout)


def rounded(draw: ImageDraw.ImageDraw, xy: tuple[int, int, int, int], fill: str) -> None:
    draw.rounded_rectangle(xy, radius=8, fill=fill)


def draw_section_label(
    draw: ImageDraw.ImageDraw,
    xy: tuple[int, int],
    label: str,
    color: str,
) -> None:
    x, y = xy
    face = font(28)
    pad_x = 18
    pad_y = 8
    width = text_width(draw, label, face) + pad_x * 2
    draw.rounded_rectangle((x, y, x + width, y + 44), radius=8, fill=color)
    draw.text((x + pad_x, y + pad_y - 3), label, fill="#FFFFFF", font=face)


def draw_wrapped(
    draw: ImageDraw.ImageDraw,
    text: str,
    xy: tuple[int, int],
    face: ImageFont.ImageFont,
    fill: str,
    max_width: int,
    line_gap: int,
) -> int:
    x, y = xy
    for line in wrap_text(draw, text, face, max_width):
        draw.text((x, y), line, fill=fill, font=face)
        y += face.size + line_gap if hasattr(face, "size") else 34
    return y


def paste_crop(
    canvas: Image.Image,
    source_image: Image.Image,
    xy: tuple[int, int],
    size: tuple[int, int],
    centering: tuple[float, float],
    radius: int,
) -> None:
    crop = ImageOps.fit(
        source_image,
        size,
        method=Image.Resampling.LANCZOS,
        centering=centering,
    )
    mask = Image.new("L", size, 0)
    mask_draw = ImageDraw.Draw(mask)
    mask_draw.rounded_rectangle((0, 0, size[0], size[1]), radius=radius, fill=255)
    canvas.paste(crop, xy, mask)


def compose(project_root: Path, slug: str, source: Path, output: Path) -> None:
    recipe = load_recipe(project_root, slug)

    canvas = Image.new("RGB", (WIDTH, HEIGHT), "#F7F1E8")
    draw = ImageDraw.Draw(canvas)

    source_image = Image.open(source).convert("RGB")

    margin = 52
    title_face = fit_font(draw, recipe["title"], 575, 68, 42)
    draw.text((margin, 52), recipe["title"], fill="#241B14", font=title_face)
    subtitle = recipe.get("subtitle") or ""
    subtitle_face = font(27)
    draw_wrapped(draw, subtitle, (margin, 136), subtitle_face, "#6C5542", 560, 7)

    draw.rounded_rectangle((666, 42, 972, 254), radius=8, fill="#FFFDFC")
    paste_crop(canvas, source_image, (678, 54), (282, 188), (0.5, 0.46), 8)

    y = 304
    rounded(draw, (margin, y, WIDTH - margin, y + 118), "#FFFDFC")
    draw_section_label(draw, (margin + 24, y + 30), "준비물", "#477A5B")
    tool_face = font(27)
    tools = recipe["tools"][:3]
    tool_x = margin + 168
    for index, tool in enumerate(tools):
        x = tool_x + index * 222
        draw.ellipse((x, y + 50, x + 14, y + 64), fill="#D97845")
        draw.text((x + 26, y + 35), tool, fill="#2E251E", font=tool_face)

    y = 452
    rounded(draw, (margin, y, WIDTH - margin, y + 236), "#FFFDFC")
    draw_section_label(draw, (margin + 26, y + 24), "재료", "#B75B42")
    left_x = margin + 38
    right_x = margin + 474
    start_y = y + 88
    ingredients = [
        f"{item['name']} {normalize_amount(item['name'], item['amount'], item['required'])}"
        for item in recipe["ingredients"]
    ]
    for index, item in enumerate(ingredients[:6]):
        column_x = left_x if index < 3 else right_x
        line_y = start_y + (index % 3) * 50
        item_face = fit_font(draw, f"- {item}", 395, 29, 22)
        draw.text((column_x, line_y), f"- {item}", fill="#2E251E", font=item_face)

    y = 724
    draw_section_label(draw, (margin, y), "초등학생 레시피", "#4B6F96")
    card_w = 440
    card_h = 298
    step_title_face = font(29)
    step_body_face = font(23)
    cue_face = font(20)
    for index, step in enumerate(recipe["steps"][:4]):
        row = index // 2
        col = index % 2
        x = margin + col * (card_w + 40)
        card_y = y + 64 + row * (card_h + 24)
        rounded(draw, (x, card_y, x + card_w, card_y + card_h), "#FFFDFC")
        badge_x = x + 24
        badge_y = card_y + 24
        draw.rounded_rectangle((badge_x, badge_y, badge_x + 54, badge_y + 54), radius=8, fill="#D97845")
        badge_face = font(28)
        draw.text((badge_x + 18, badge_y + 8), str(index + 1), fill="#FFFFFF", font=badge_face)
        text_x = x + 96
        draw.text((text_x, card_y + 26), step["title"], fill="#241B14", font=step_title_face)
        action_y = draw_wrapped(
            draw,
            step["action"],
            (x + 30, card_y + 96),
            step_body_face,
            "#4B3A2D",
            card_w - 60,
            7,
        )
        cue = step.get("visualCue") or ""
        if cue:
            draw.rounded_rectangle((x + 28, card_y + 222, x + card_w - 28, card_y + 270), radius=8, fill="#F7F1E8")
            cue_text = f"보이면 OK: {cue}"
            draw_wrapped(draw, cue_text, (x + 44, card_y + 232), cue_face, "#6C5542", card_w - 88, 4)

    output.parent.mkdir(parents=True, exist_ok=True)
    canvas.save(output, "PNG", optimize=True)


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--project-root", required=True, type=Path)
    parser.add_argument("--slug", required=True)
    parser.add_argument("--source", required=True, type=Path)
    parser.add_argument("--output", required=True, type=Path)
    args = parser.parse_args()

    compose(
        project_root=args.project_root.resolve(),
        slug=args.slug,
        source=args.source.resolve(),
        output=args.output.resolve(),
    )


if __name__ == "__main__":
    main()
