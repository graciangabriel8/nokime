#!/usr/bin/env python3
"""apple-touch-icon.png (180×180): the découpe on the site's dark ground, rasterised by QuickLook."""
import pathlib, subprocess, tempfile, sys
root = pathlib.Path(__file__).resolve().parent.parent
svg = f"""<svg xmlns="http://www.w3.org/2000/svg" width="720" height="720" viewBox="0 0 240 240"><rect width="240" height="240" fill="#15170F"/>
<g transform="translate(120 120) scale(0.72) translate(-120 -120)"><path fill="#ECEBE2" d="M15 181V59A44 44 0 0 1 59 15H150V137.65L67.5 41.65V225H59A44 44 0 0 1 15 181Z"/><path fill="#BBEB8A" d="M90 225V102.35L172.5 198.35V15H181A44 44 0 0 1 225 59V181A44 44 0 0 1 181 225Z"/></g></svg>"""
tmp = pathlib.Path(tempfile.mkdtemp()); src = tmp / "icon.svg"; src.write_text(svg, encoding="utf-8")
# QuickLook draws a small SVG at 60 % in the corner of its thumbnail: render large, then shrink with sips
subprocess.run(["qlmanage", "-t", "-s", "720", "-o", str(tmp), str(src)], check=True, capture_output=True)
out = tmp / "icon.svg.png"
if not out.exists(): sys.exit("QuickLook produced no PNG")
subprocess.run(["sips", "-z", "180", "180", str(out), "--out", str(root / "apple-touch-icon.png")], check=True, capture_output=True); print("apple-touch-icon.png:", (root / "apple-touch-icon.png").stat().st_size, "bytes")
