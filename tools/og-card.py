#!/usr/bin/env python3
"""Render og.png, the 1200×630 card link previews show, from the site's own drawings and
typefaces. Fetches the two TTFs once into a scratch dir, writes an SVG with the fonts
embedded, and rasterises it with macOS QuickLook (no other renderer on this machine):

    python3 tools/og-card.py            # writes ./og.png
"""
import base64, json, pathlib, re, subprocess, sys, tempfile, urllib.request
root = pathlib.Path(__file__).resolve().parent.parent
UA_OLD = "Mozilla/4.0"   # a legacy user agent makes the fonts API hand over TTF files
def ttf(family_query):
    css = urllib.request.urlopen(urllib.request.Request("https://fonts.googleapis.com/css2?family=" + family_query, headers={"User-Agent": UA_OLD}), timeout=40).read().decode()
    url = re.search(r"url\(([^)]+\.ttf)\)", css).group(1)
    return base64.b64encode(urllib.request.urlopen(url, timeout=40).read()).decode()
fraunces, plex = ttf("Fraunces:wght@400"), ttf("IBM+Plex+Sans:wght@500")
art = json.loads(re.search(r"window\.NOKIME_ART=(\{.*\});", (root / "js/art.js").read_text(encoding="utf-8"), re.S).group(1))
def drawing(id_, x, y, size):
    return f'<svg x="{x}" y="{y}" width="{size}" height="{size}" viewBox="0 0 96 96">{art[id_]["svg"]}</svg>'
# QuickLook thumbnails a square: the 1200×630 card sits centred on a 1200×1200 canvas, cropped after.
svg = f'''<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="1200" viewBox="0 0 1200 1200">
<defs><style>
@font-face{{font-family:"Fraunces";src:url(data:font/ttf;base64,{fraunces}) format("truetype")}}
@font-face{{font-family:"IBM Plex Sans";src:url(data:font/ttf;base64,{plex}) format("truetype")}}
.f1{{fill:#E9E9E6}}.f2{{fill:#D7D7D3}}.f3{{fill:#BCBCB6}}.dot{{fill:#585853}}
.s{{fill:none;stroke:#585853;stroke-width:2.4;stroke-linecap:round;stroke-linejoin:round}}
.sf{{stroke:#585853;stroke-width:2.4;stroke-linecap:round;stroke-linejoin:round}}
</style></defs>
<rect width="1200" height="1200" fill="#FFFFFF"/>
<g transform="translate(0,285)">
<g transform="translate(80,74)"><g transform="scale(0.1875)" fill="none" stroke-linecap="square" stroke-linejoin="round"><circle cx="120" cy="120" r="91" stroke="#5E7D45" stroke-width="14"/><circle cx="120" cy="120" r="71" stroke="#1B1E17" stroke-width="3"/><path d="M69 171V69l102 102V69" stroke="#1B1E17" stroke-width="18"/><circle cx="120" cy="29" r="7" fill="#5E7D45" stroke="none"/><circle cx="120" cy="211" r="7" fill="#5E7D45" stroke="none"/></g>
<text x="58" y="34" font-family="Fraunces, Georgia, serif" font-size="34" fill="#1B1E17">Nokime</text></g>
<text x="80" y="176" font-family="IBM Plex Sans, Helvetica, sans-serif" font-size="17" letter-spacing="2.4" fill="#63675A">OUTILS POUR LA RESTAURATION</text>
<text font-family="Fraunces, Georgia, serif" font-size="74" fill="#1B1E17" letter-spacing="-0.5">
<tspan x="80" y="300">Une maison d’outils</tspan><tspan x="80" y="386">pour la restauration.</tspan></text>
<text x="80" y="500" font-family="IBM Plex Sans, Helvetica, sans-serif" font-size="24" fill="#4F5346">Des outils qui se connaissent, pour ceux qui tiennent une cuisine.</text>
{drawing("sea-bass", 830, 150, 250)}{drawing("asparagus", 1000, 100, 170)}{drawing("lemon", 980, 330, 170)}
<rect x="80" y="576" width="1040" height="1" fill="#E9EAE2"/>
</g>
</svg>'''
tmp = pathlib.Path(tempfile.mkdtemp()); src = tmp / "og.svg"; src.write_text(svg, encoding="utf-8")
subprocess.run(["qlmanage", "-t", "-s", "1200", "-o", str(tmp), str(src)], check=True, capture_output=True)
out = tmp / "og.svg.png"
if not out.exists(): sys.exit("QuickLook produced no PNG")
subprocess.run(["sips", "--cropToHeightWidth", "630", "1200", str(out), "--out", str(root / "og.png")], check=True, capture_output=True)
print("og.png:", (root / "og.png").stat().st_size // 1024, "KB")
