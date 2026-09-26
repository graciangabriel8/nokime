#!/usr/bin/env python3
"""Render og.png, the 1200×630 card link previews show, from the site's own drawings and
typefaces. Fetches the three TTFs once into a scratch dir, writes an SVG with the fonts
embedded, and rasterises it with macOS QuickLook (no other renderer on this machine):

    python3 tools/og-card.py            # writes ./og.png
"""
import base64, json, pathlib, re, subprocess, sys, tempfile, urllib.request
root = pathlib.Path(__file__).resolve().parent.parent
UA_OLD = "Mozilla/4.0"   # a legacy user agent makes the fonts API hand over TTF files
def ttf(family_query, stretch=None):
    css = urllib.request.urlopen(urllib.request.Request("https://fonts.googleapis.com/css2?family=" + family_query, headers={"User-Agent": UA_OLD}), timeout=40).read().decode()
    # a width axis returns one @font-face per width: take the one asked for (Archivo at 112 % is « semi-expanded »)
    block = next(b for b in css.split("@font-face") if "url(" in b and (stretch is None or stretch in b))
    url = re.search(r"url\(([^)]+\.ttf)\)", block).group(1)
    return base64.b64encode(urllib.request.urlopen(url, timeout=40).read()).decode()
fraunces, plex, archivo = ttf("Fraunces:wght@400"), ttf("IBM+Plex+Sans:wght@500"), ttf("Archivo:wdth,wght@112,700", stretch="semi-expanded")
art = json.loads(re.search(r"window\.NOKIME_ART=(\{.*\});", (root / "js/art.js").read_text(encoding="utf-8"), re.S).group(1))
def drawing(id_, x, y, size):
    return f'<svg x="{x}" y="{y}" width="{size}" height="{size}" viewBox="0 0 96 96">{art[id_]["svg"]}</svg>'
# QuickLook thumbnails a square: the 1200×630 card sits centred on a 1200×1200 canvas, cropped after.
svg = f'''<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="1200" viewBox="0 0 1200 1200">
<defs><style>
@font-face{{font-family:"Fraunces";src:url(data:font/ttf;base64,{fraunces}) format("truetype")}}
@font-face{{font-family:"IBM Plex Sans";src:url(data:font/ttf;base64,{plex}) format("truetype")}}
@font-face{{font-family:"Archivo";font-weight:700;src:url(data:font/ttf;base64,{archivo}) format("truetype")}}
.f1{{fill:#2F2F2C}}.f2{{fill:#3A3A36}}.f3{{fill:#4A4A45}}.dot{{fill:#B8B5AE}}
.s{{fill:none;stroke:#B8B5AE;stroke-width:2.4;stroke-linecap:round;stroke-linejoin:round}}
.sf{{stroke:#B8B5AE;stroke-width:2.4;stroke-linecap:round;stroke-linejoin:round}}
</style></defs>
<rect width="1200" height="1200" fill="#15170F"/>
<g transform="translate(0,285)">
<g transform="translate(80,70)"><g transform="scale(0.19)"><path fill="#ECEBE2" d="M15 181V59A44 44 0 0 1 59 15H150V137.65L67.5 41.65V225H59A44 44 0 0 1 15 181Z"/><path fill="#BBEB8A" d="M90 225V102.35L172.5 198.35V15H181A44 44 0 0 1 225 59V181A44 44 0 0 1 181 225Z"/></g><text x="60" y="36" font-family="Archivo, Helvetica, sans-serif" font-weight="700" font-size="36" letter-spacing="-0.5" fill="#ECEBE2">nokime</text></g>
<text x="80" y="176" font-family="IBM Plex Sans, Helvetica, sans-serif" font-size="17" letter-spacing="2.4" fill="#8C907F">OUTILS POUR LA RESTAURATION</text>
<text font-family="Fraunces, Georgia, serif" font-size="74" fill="#ECEBE2" letter-spacing="-0.5">
<tspan x="80" y="300">Une maison d’outils</tspan><tspan x="80" y="386">pour la restauration.</tspan></text>
<text x="80" y="500" font-family="IBM Plex Sans, Helvetica, sans-serif" font-size="24" fill="#BDBFAE">Des outils qui se connaissent, pour ceux qui tiennent une cuisine.</text>
{drawing("sea-bass", 830, 150, 250)}{drawing("asparagus", 1000, 100, 170)}{drawing("lemon", 980, 330, 170)}
<rect x="80" y="576" width="1040" height="1" fill="#2A2D22"/>
</g>
</svg>'''
tmp = pathlib.Path(tempfile.mkdtemp()); src = tmp / "og.svg"; src.write_text(svg, encoding="utf-8")
subprocess.run(["qlmanage", "-t", "-s", "1200", "-o", str(tmp), str(src)], check=True, capture_output=True)
out = tmp / "og.svg.png"
if not out.exists(): sys.exit("QuickLook produced no PNG")
subprocess.run(["sips", "--cropToHeightWidth", "630", "1200", str(out), "--out", str(root / "og.png")], check=True, capture_output=True)
print("og.png:", (root / "og.png").stat().st_size // 1024, "KB")
