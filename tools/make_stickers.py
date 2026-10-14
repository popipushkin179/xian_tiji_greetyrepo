"""Turn downloaded sticker GIFs/WebPs into small animated WebPs for the site.

Reads  internal/stickers/raw   (small transparent WebPs) and internal/stickers/big (full-size GIFs), both gitignored.
Writes public/media/stickers/<name>.webp and prints a size table.

Run:  uv run --with pillow --with numpy python -I tools/make_stickers.py

  CUT   transparent animated WebPs: kept, re-encoded smaller only if they are heavy
  CARD  opaque GIFs: resized, frames decimated, lossy WebP
  KEY   green-screen GIFs: green keyed out to transparency, then like CARD
"""
import math
from pathlib import Path

import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
RAW = ROOT / "internal" / "stickers" / "raw"
BIG = ROOT / "internal" / "stickers" / "big"
OUT = ROOT / "public" / "media" / "stickers"

CUT = ["floss", "flycat", "frugit1", "frugit3", "gogalien", "kittydance", "maxwell1", "nubcat", "orangeback",
       "orangecartoon", "pochacco2", "saxcat", "threekit_t", "tofuinu", "toothless", "whitecat"]
# name -> output width
CARD = {"aidog": 300, "aikitten2": 300, "aikitten3": 420, "aipoodle": 300, "bdaycard": 400, "beachpair": 380,
        "corgi": 340, "dogmirror": 300, "sinkcats": 280, "watercat": 340}
KEY = {"threegreen": 360}


def read(path: Path) -> tuple[list[Image.Image], list[int]]:
    im = Image.open(path)
    frames, durs = [], []
    for i in range(getattr(im, "n_frames", 1)):
        im.seek(i)
        frames.append(im.convert("RGBA").copy())
        durs.append(max(20, im.info.get("duration", 60)))
    return frames, durs


def decimate(frames: list[Image.Image], durs: list[int], max_frames: int) -> tuple[list[Image.Image], list[int]]:
    step = max(1, math.ceil(len(frames) / max_frames))
    f2, d2 = [], []
    for i in range(0, len(frames), step):
        f2.append(frames[i])
        d2.append(sum(durs[i:i + step]))
    return f2, d2


def resize(frames: list[Image.Image], width: int) -> list[Image.Image]:
    if frames[0].width <= width:
        return frames
    h = round(frames[0].height * width / frames[0].width)
    return [f.resize((width, h), Image.LANCZOS) for f in frames]


def key_green(im: Image.Image) -> Image.Image:
    a = np.array(im.convert("RGBA")).astype(np.int32)
    r, g, b = a[..., 0], a[..., 1], a[..., 2]
    greenness = g - np.maximum(r, b)          # how much greener than the other channels
    alpha = np.clip((90 - greenness) * 255 // 60, 0, 255)  # fully keyed above ~90, soft edge down to ~30
    # despill: pull residual green out of edge pixels
    spill = greenness > 8
    g2 = np.where(spill, np.minimum(g, np.maximum(r, b) + 8), g)
    a[..., 1] = g2
    a[..., 3] = np.minimum(a[..., 3], alpha)
    return Image.fromarray(a.astype(np.uint8), "RGBA")


def save(frames: list[Image.Image], durs: list[int], name: str, quality: int) -> None:
    p = OUT / f"{name}.webp"
    frames[0].save(p, "WEBP", save_all=True, append_images=frames[1:], duration=durs, loop=0, quality=quality,
                   method=4, lossless=False)
    print(f"{name:14s} {frames[0].width:4d}x{frames[0].height:<4d} {len(frames):3d}f {p.stat().st_size // 1024:5d} KB")


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    for name in CUT:
        src = RAW / f"{name}.webp"
        frames, durs = read(src)
        if src.stat().st_size > 250_000:
            frames, durs = decimate(frames, durs, 70)
            save(frames, durs, name, 60)
        else:
            (OUT / f"{name}.webp").write_bytes(src.read_bytes())
            print(f"{name:14s} copied {src.stat().st_size // 1024:5d} KB")
    for name, w in CARD.items():
        frames, durs = read(BIG / f"{name}.gif")
        frames, durs = decimate(frames, durs, 70)
        save(resize(frames, w), durs, name, 50 if name == "bdaycard" else 62)
    for name, w in KEY.items():
        frames, durs = read(BIG / f"{name}.gif")
        frames, durs = decimate(frames, durs, 70)
        frames = [key_green(f) for f in resize(frames, w)]
        save(frames, durs, name, 70)


if __name__ == "__main__":
    main()
