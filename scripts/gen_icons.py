#!/usr/bin/env python3
"""Generate placeholder icons for markdpad.
Produces solid-color PNGs at the sizes Tauri expects. Replace before shipping."""
import os, struct, zlib

OUT = os.path.join(os.path.dirname(__file__), "..", "src-tauri", "icons")
os.makedirs(OUT, exist_ok=True)

# Brand color: deep blue accent
R, G, B, A = 0x0F, 0x52, 0xA1, 0xFF
# Mark color: white
MR, MG, MB, MA = 0xFF, 0xFF, 0xFF, 0xFF

def write_png(path, w, h):
    # RGBA pixel grid with a centered "M" silhouette
    pixels = bytearray()
    for y in range(h):
        pixels.append(0)  # filter byte: None
        for x in range(w):
            # Simple "M" mark: two vertical bars + diagonals in central region
            cx, cy = w / 2, h / 2
            relx = (x - cx) / (w / 2)
            rely = (y - cy) / (h / 2)
            mark = False
            if -0.6 <= relx <= 0.6 and -0.5 <= rely <= 0.5:
                # left vertical
                if -0.55 <= relx <= -0.35:
                    mark = True
                # right vertical
                elif 0.35 <= relx <= 0.55:
                    mark = True
                # left diagonal: from (-0.4, -0.5) to (0.0, 0.1)
                elif -0.4 <= relx <= 0.0 and abs((rely + 0.5) - (relx + 0.4) * (0.6 / 0.4)) < 0.08:
                    mark = True
                # right diagonal: from (0.0, 0.1) to (0.4, -0.5)
                elif 0.0 <= relx <= 0.4 and abs((rely + 0.5) - (0.4 - relx) * (0.6 / 0.4)) < 0.08:
                    mark = True
            if mark:
                pixels += bytes((MR, MG, MB, MA))
            else:
                pixels += bytes((R, G, B, A))

    def chunk(tag, data):
        out = struct.pack(">I", len(data)) + tag + data
        crc = zlib.crc32(tag + data) & 0xFFFFFFFF
        return out + struct.pack(">I", crc)

    sig = b"\x89PNG\r\n\x1a\n"
    ihdr = struct.pack(">IIBBBBB", w, h, 8, 6, 0, 0, 0)  # 8-bit RGBA
    idat = zlib.compress(bytes(pixels), 9)
    iend = b""
    with open(path, "wb") as f:
        f.write(sig + chunk(b"IHDR", ihdr) + chunk(b"IDAT", idat) + chunk(b"IEND", iend))

def write_ico(png_path, ico_path, size):
    # Minimal ICO that embeds a single PNG.
    with open(png_path, "rb") as f:
        png = f.read()
    header = struct.pack("<HHH", 0, 1, 1)  # reserved, type=icon, count=1
    s = 0 if size == 256 else size
    entry = struct.pack("<BBBBHHII",
        s, s, 0, 0, 1, 32, len(png), 6 + 16)
    with open(ico_path, "wb") as f:
        f.write(header + entry + png)

def write_icns_stub(path):
    # Minimal valid ICNS containing a 128 PNG; mac users will rarely run this anyway.
    with open(os.path.join(OUT, "128x128.png"), "rb") as f:
        png = f.read()
    body = b"ic07" + struct.pack(">I", 8 + len(png)) + png
    header = b"icns" + struct.pack(">I", 8 + len(body))
    with open(path, "wb") as f:
        f.write(header + body)

write_png(os.path.join(OUT, "32x32.png"), 32, 32)
write_png(os.path.join(OUT, "128x128.png"), 128, 128)
write_png(os.path.join(OUT, "128x128@2x.png"), 256, 256)
write_ico(os.path.join(OUT, "128x128.png"), os.path.join(OUT, "icon.ico"), 128)
write_icns_stub(os.path.join(OUT, "icon.icns"))
print("Icons written to", OUT)
