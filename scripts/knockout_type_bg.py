"""Flood-fill studio backdrop from the image edges only."""
from pathlib import Path
from math import sqrt

from PIL import Image

ROOT = Path(__file__).resolve().parents[1] / "assets" / "types"
SRC = Path("/Users/albertjohannes/.cursor/projects/Users-albertjohannes-Repository-productX/assets")
MAP = {
    "type-car-gs.png": "type-car.png",
    "type-motorcycle-gs.png": "type-motorcycle.png",
    "type-bike-gs.png": "type-bike.png",
    "type-ac-gs.png": "type-ac.png",
    "type-water-heater-gs.png": "type-water-heater.png",
    "type-other-gs.png": "type-other.png",
}
LIMIT = 18.0


def dist(a, b) -> float:
    return sqrt((a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2 + (a[2] - b[2]) ** 2)


def knock(src: Path, dest: Path) -> None:
    im = Image.open(src).convert("RGBA")
    px = im.load()
    w, h = im.size
    samples = [px[2, 2], px[w - 3, 2], px[2, h - 3], px[w - 3, h - 3]]
    bg = tuple(sum(s[i] for s in samples) // 4 for i in range(3))
    seen = bytearray(w * h)
    stack = []
    for x in range(w):
        stack.append((x, 0))
        stack.append((x, h - 1))
    for y in range(h):
        stack.append((0, y))
        stack.append((w - 1, y))
    while stack:
        x, y = stack.pop()
        if x < 0 or y < 0 or x >= w or y >= h:
            continue
        i = y * w + x
        if seen[i]:
            continue
        seen[i] = 1
        r, g, b, a = px[x, y]
        if dist((r, g, b), bg) > LIMIT:
            continue
        px[x, y] = (r, g, b, 0)
        stack.extend(((x - 1, y), (x + 1, y), (x, y - 1), (x, y + 1)))
    for y in range(h):
        for x in range(w):
            r, g, b, a = px[x, y]
            if a == 0:
                continue
            if g > 160 and g > r + 50 and g > b + 50:
                px[x, y] = (r, g, b, 0)
    im.save(dest)
    print("cleared", dest.name, "bg", bg)


def main() -> None:
    for a, b in MAP.items():
        knock(SRC / a, ROOT / b)


if __name__ == "__main__":
    main()
