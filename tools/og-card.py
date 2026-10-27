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
fraunces, fraunces_it = ttf("Fraunces:opsz,wght@72,400"), ttf("Fraunces:ital,opsz,wght@1,72,400")   # display optical size, as the site sets it
plex, archivo = ttf("IBM+Plex+Sans:wght@500"), ttf("Archivo:wdth,wght@112,700", stretch="semi-expanded")
art = json.loads(re.search(r"window\.NOKIME_ART=(\{.*\});", (root / "js/art.js").read_text(encoding="utf-8"), re.S).group(1))
def drawing(id_, x, y, size):
    return f'<svg x="{x}" y="{y}" width="{size}" height="{size}" viewBox="0 0 96 96">{art[id_]["svg"]}</svg>'
# QuickLook thumbnails a square: the 1200×630 card sits centred on a 1200×1200 canvas, cropped after.
svg = f'''<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="1200" viewBox="0 0 1200 1200">
<defs><style>
@font-face{{font-family:"Fraunces";src:url(data:font/ttf;base64,{fraunces}) format("truetype")}}
@font-face{{font-family:"Fraunces";font-style:italic;src:url(data:font/ttf;base64,{fraunces_it}) format("truetype")}}
.idea{{fill:#3E6B1F;font-style:italic}}.calm{{fill:#876510;font-style:italic}}
@font-face{{font-family:"IBM Plex Sans";src:url(data:font/ttf;base64,{plex}) format("truetype")}}
@font-face{{font-family:"Archivo";font-weight:700;src:url(data:font/ttf;base64,{archivo}) format("truetype")}}
.f1{{fill:#E9E9E6}}.f2{{fill:#D7D7D3}}.f3{{fill:#BCBCB6}}.dot{{fill:#585853}}
.s{{fill:none;stroke:#585853;stroke-width:2.4;stroke-linecap:round;stroke-linejoin:round}}
.sf{{stroke:#585853;stroke-width:2.4;stroke-linecap:round;stroke-linejoin:round}}
</style>
<!-- « sans se prendre la tête » fades from Jobs blue to Manager brass across its two lines, as on the site -->
<linearGradient id="fade1" gradientUnits="userSpaceOnUse" x1="233" y1="0" x2="615" y2="0"><stop offset="0" stop-color="#2038D5"/><stop offset="0.25" stop-color="#304DB8"/><stop offset="0.5" stop-color="#43599B"/><stop offset="0.75" stop-color="#58607C"/><stop offset="1" stop-color="#6C645A"/></linearGradient><linearGradient id="fade2" gradientUnits="userSpaceOnUse" x1="80" y1="0" x2="230" y2="0"><stop offset="0" stop-color="#6C645A"/><stop offset="0.25" stop-color="#73654D"/><stop offset="0.5" stop-color="#7A653F"/><stop offset="0.75" stop-color="#80652D"/><stop offset="1" stop-color="#876510"/></linearGradient></defs>
<rect width="1200" height="1200" fill="#F3F1E8"/>
<g transform="translate(0,285)">
<g transform="translate(80,70)"><g transform="scale(0.19)"><path fill="#15170F" d="M15 181V59A44 44 0 0 1 59 15H150V137.65L67.5 41.65V225H59A44 44 0 0 1 15 181Z"/><path fill="#3E6B1F" d="M90 225V102.35L172.5 198.35V15H181A44 44 0 0 1 225 59V181A44 44 0 0 1 181 225Z"/></g><text x="60" y="36" font-family="Archivo, Helvetica, sans-serif" font-weight="700" font-size="36" letter-spacing="-0.5" fill="#15170F">nokime</text></g>
<text font-family="Fraunces, Georgia, serif" font-size="62" fill="#15170F" letter-spacing="-0.5">
<tspan x="80" y="232">Cuisiner avec <tspan class="idea">des idées</tspan>,</tspan><tspan x="80" y="306">gérer <tspan class="calm" style="fill:url(#fade1)">sans se prendre</tspan></tspan><tspan x="80" y="380"><tspan class="calm" style="fill:url(#fade2)">la tête</tspan>.</tspan></text>
<text font-family="IBM Plex Sans, Helvetica, sans-serif" font-size="23" fill="#45483C">
<tspan x="80" y="470">Copius pour trouver l’inspiration, Jobs pour recruter,</tspan><tspan x="80" y="504">Manager pour savoir si le plat est rentable.</tspan></text>
{drawing("chicken", 770, 150, 290)}{drawing("langoustine", 1000, 50, 170)}{drawing("fraise-des-bois", 1010, 350, 150)}
<rect x="80" y="576" width="1040" height="1" fill="#E2DFD3"/>
</g>
</svg>'''
tmp = pathlib.Path(tempfile.mkdtemp()); src = tmp / "og.svg"; src.write_text(svg, encoding="utf-8")
subprocess.run(["qlmanage", "-t", "-s", "1200", "-o", str(tmp), str(src)], check=True, capture_output=True)
out = tmp / "og.svg.png"
if not out.exists(): sys.exit("QuickLook produced no PNG")
subprocess.run(["sips", "--cropToHeightWidth", "630", "1200", str(out), "--out", str(root / "og.png")], check=True, capture_output=True)
print("og.png:", (root / "og.png").stat().st_size // 1024, "KB")
