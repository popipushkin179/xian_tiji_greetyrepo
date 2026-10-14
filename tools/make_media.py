"""Process the personal pics/ folder into web-ready copies. EXIF is dropped, orientation is baked in.

Run:  uv run --with pillow python -I tools/make_media.py
Reads pics/ (gitignored), writes public/media/people and public/media/cats (also gitignored by default).
"""
import subprocess
from pathlib import Path

from PIL import Image, ImageOps

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "pics"
PEOPLE = ROOT / "public" / "media" / "people"
CATS = ROOT / "public" / "media" / "cats"

PHOTOS = {
    "person1.png": "p1", "person2.png": "p2", "person3.png": "p3",
    "person4-hd-main.jpeg": "p4", "person5-hd-main.jpeg": "p5",
}
GIFS = {
    "funny-cat.gif": "cat-dance", "kitten-orange.gif": "cat-orange",
    "kitten-stare.gif": "cat-stare", "sillycat1.gif": "cat-silly",
}


def photo(src: Path, name: str, width: int = 1100) -> None:
    im = ImageOps.exif_transpose(Image.open(src)).convert("RGB")
    if im.width > width:
        im = im.resize((width, round(im.height * width / im.width)), Image.LANCZOS)
    im.save(PEOPLE / f"{name}.avif", "AVIF", quality=58, speed=6)
    im.save(PEOPLE / f"{name}.jpg", "JPEG", quality=84, optimize=True)  # no exif passed, so none written
    print(name, im.size)


def gif(src: Path, name: str) -> None:
    im = Image.open(src)
    frames, durs = [], []
    for i in range(im.n_frames):
        im.seek(i)
        frames.append(im.convert("RGBA").copy())
        durs.append(im.info.get("duration", 80))
    frames[0].save(CATS / f"{name}.webp", "WEBP", save_all=True, append_images=frames[1:],
                   duration=durs, loop=0, quality=70, method=6)
    print(name, im.size, im.n_frames, (CATS / f"{name}.webp").stat().st_size // 1024, "KB")


def video() -> None:
    src = SRC / "person6-vidhd-1.mp4"
    out = PEOPLE / "v1.mp4"
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", str(src), "-map_metadata", "-1",
                    "-c:v", "libx264", "-crf", "23", "-preset", "slow", "-pix_fmt", "yuv420p",
                    "-c:a", "aac", "-b:a", "96k", "-movflags", "+faststart", str(out)], check=True)
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-ss", "1.2", "-i", str(src), "-frames:v", "1",
                    "-map_metadata", "-1", "-q:v", "3", str(PEOPLE / "v1-poster.jpg")], check=True)
    print("video", out.stat().st_size // 1024, "KB")


if __name__ == "__main__":
    for f, n in PHOTOS.items():
        photo(SRC / f, n)
    for f, n in GIFS.items():
        gif(SRC / f, n)
    video()
