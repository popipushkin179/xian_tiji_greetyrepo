"""Turn a video into a scroll-scrub frame sequence (AVIF or WebP files).

ffmpeg decodes and resizes, raw RGB frames are piped straight into Pillow's AVIF or WebP
encoder, so no PNG temp files are written. Homebrew ffmpeg ships without libwebp.

Run:
    uv run --with pillow python -I tools/make_frames.py INPUT OUT_DIR --width 810 --frames 120 --quality 45 --fmt avif
Writes OUT_DIR/f0001.<fmt> ... and OUT_DIR/manifest.json.
AVIF q45 measured about half the size of WebP q60 on blossom footage with no visible difference
(side-by-side crop, 2026-10-14).
"""
import argparse
import json
import subprocess
import sys
from pathlib import Path

from PIL import Image


def probe(path: str) -> tuple[int, int, float]:
    out = subprocess.check_output(
        ["ffprobe", "-v", "error", "-select_streams", "v:0",
         "-show_entries", "stream=width,height,duration", "-of", "json", path]
    )
    s = json.loads(out)["streams"][0]
    return int(s["width"]), int(s["height"]), float(s["duration"])


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("src")
    ap.add_argument("out")
    ap.add_argument("--width", type=int, default=900)
    ap.add_argument("--frames", type=int, default=150)
    ap.add_argument("--quality", type=int, default=72)
    ap.add_argument("--fmt", default="avif", choices=("avif", "webp"))
    ap.add_argument("--start", type=float, default=0.0, help="start second")
    ap.add_argument("--duration", type=float, default=0.0, help="seconds to use (0 = to the end)")
    ap.add_argument("--fps", type=float, default=0.0, help="fixed sample rate; overrides --frames")
    ap.add_argument("--pre", default="", help="ffmpeg filter run before scaling, e.g. hqdn3d=3:3:4:4")
    args = ap.parse_args()

    w, h, dur = probe(args.src)
    out_w = args.width - (args.width % 2)
    out_h = round(h * out_w / w)
    out_h -= out_h % 2
    dur_eff = args.duration if args.duration > 0 else max(0.1, dur - args.start)
    fps = args.fps if args.fps > 0 else args.frames / dur_eff
    vf = ((args.pre + ",") if args.pre else "") + f"fps={fps:.5f},scale={out_w}:{out_h}:flags=lanczos"
    out = Path(args.out)
    out.mkdir(parents=True, exist_ok=True)
    for old in list(out.glob("f*.webp")) + list(out.glob("f*.avif")):
        old.unlink()

    cmd = ["ffmpeg", "-v", "error", "-ss", str(args.start), "-t", f"{dur_eff:.3f}", "-i", args.src, "-vf", vf,
           "-f", "rawvideo", "-pix_fmt", "rgb24", "-"]
    proc = subprocess.Popen(cmd, stdout=subprocess.PIPE)
    frame_bytes = out_w * out_h * 3
    n = 0
    total = 0
    while True:
        buf = proc.stdout.read(frame_bytes)
        if len(buf) < frame_bytes:
            break
        n += 1
        im = Image.frombytes("RGB", (out_w, out_h), buf)
        p = out / f"f{n:04d}.{args.fmt}"
        if args.fmt == "avif":
            im.save(p, "AVIF", quality=args.quality, speed=6)
        else:
            im.save(p, "WEBP", quality=args.quality, method=6)
        total += p.stat().st_size
    proc.wait()
    manifest = {"frames": n, "width": out_w, "height": out_h, "ext": args.fmt,
                "bytes": total, "source_seconds": round(dur_eff, 3), "fps": round(fps, 3)}
    (out / "manifest.json").write_text(json.dumps(manifest))
    print(f"{args.src}: {n} frames {out_w}x{out_h} total {total/1e6:.2f} MB avg {total/max(n,1)/1e3:.0f} KB")
    return 0


if __name__ == "__main__":
    sys.exit(main())
