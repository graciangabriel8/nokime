#!/usr/bin/env python3
"""apple-touch-icon.png (180×180): the medallion on white, rasterised by QuickLook."""
import pathlib, subprocess, tempfile, sys
root = pathlib.Path(__file__).resolve().parent.parent
svg = """<svg xmlns="http://www.w3.org/2000/svg" width="180" height="180" viewBox="0 0 240 240"><rect width="240" height="240" fill="#FFFFFF"/>
<g fill="none" stroke-linecap="square" stroke-linejoin="round" transform="translate(120 120) scale(0.86) translate(-120 -120)"><circle cx="120" cy="120" r="91" stroke="#4F5B3F" stroke-width="14"/><circle cx="120" cy="120" r="71" stroke="#1B1E17" stroke-width="3"/><path d="M69 171V69l102 102V69" stroke="#1B1E17" stroke-width="18"/></g>
<g transform="translate(120 120) scale(0.86) translate(-120 -120)"><circle cx="120" cy="29" r="7" fill="#4F5B3F"/><circle cx="120" cy="211" r="7" fill="#4F5B3F"/></g></svg>"""
tmp = pathlib.Path(tempfile.mkdtemp()); src = tmp / "icon.svg"; src.write_text(svg, encoding="utf-8")
subprocess.run(["qlmanage", "-t", "-s", "180", "-o", str(tmp), str(src)], check=True, capture_output=True)
out = tmp / "icon.svg.png"
if not out.exists(): sys.exit("QuickLook produced no PNG")
(root / "apple-touch-icon.png").write_bytes(out.read_bytes()); print("apple-touch-icon.png:", (root / "apple-touch-icon.png").stat().st_size, "bytes")
