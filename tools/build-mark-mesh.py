#!/usr/bin/env python3
"""
Melange Mercantile — pillar mark: SVG -> beveled 3D mesh -> GLB.

Self-contained. Regenerates the exact geometry used in the Spline scene, and
writes a glTF 2.0 binary (.glb) that loads directly in three.js /
react-three-fiber (useGLTF) with no Spline dependency.

    python3 tools/build-mark-mesh.py

Tunables are in CONFIG below. The bevel is a tangent elliptical arc that
TAPERS at sharp corners (see BRAND.md) — do not replace it with a fixed miter,
that is what produced visible creases.
"""
import re, math, json, struct, os

CONFIG = dict(
    svg        = "brand-assets/logo-mark-spline.svg",
    out        = "brand-assets/melange-mark.glb",
    height     = 600.0,   # world units, total mark height
    half_depth = 12.0,    # half the slab thickness (total depth = 24)
    min_edge   = 7.0,     # collapse contour edges shorter than this before offsetting
    flatten    = 0.7,     # Douglas-Peucker tolerance on the raw trace
    steps      = 8,       # bevel profile samples (per side)
    taper_mult = 1.5,     # cap offset length at this * inset  -> bevel tapers at points
    smooth     = 3,       # cyclic 1-2-1 passes over offset magnitudes
    crease     = 50,      # faces meeting at more than this (degrees) get a crisp edge, not a shared normal
    base_color = "#9EA2A6",
    metallic   = 0.88,
    roughness  = 0.28,
)

# ---------------------------------------------------------------- svg parsing
def parse_paths(svg_text):
    out = []
    for d in re.findall(r'<path d="([^"]*)"', svg_text):
        toks = re.findall(r"[MmCcLlZz]|-?\d*\.?\d+", d)
        contours, cur, pos, start, cmd = [], [], (0.0, 0.0), (0.0, 0.0), None
        i = 0
        def bez(p0, p1, p2, p3, n):
            r = []
            for k in range(1, n + 1):
                t = k / n; u = 1 - t
                r.append((u*u*u*p0[0] + 3*u*u*t*p1[0] + 3*u*t*t*p2[0] + t*t*t*p3[0],
                          u*u*u*p0[1] + 3*u*u*t*p1[1] + 3*u*t*t*p2[1] + t*t*t*p3[1]))
            return r
        while i < len(toks):
            t = toks[i]
            if re.match(r"[A-Za-z]", t):
                cmd = t; i += 1
                if cmd in "Zz":
                    if len(cur) > 2: contours.append(cur)
                    cur = []; pos = start
                continue
            if cmd == "M":
                pos = (float(toks[i]), float(toks[i+1])); start = pos
                if len(cur) > 2: contours.append(cur)
                cur = [pos]; i += 2
            elif cmd == "l":
                pos = (pos[0] + float(toks[i]), pos[1] + float(toks[i+1])); cur.append(pos); i += 2
            elif cmd == "c":
                p1 = (pos[0] + float(toks[i]),   pos[1] + float(toks[i+1]))
                p2 = (pos[0] + float(toks[i+2]), pos[1] + float(toks[i+3]))
                p3 = (pos[0] + float(toks[i+4]), pos[1] + float(toks[i+5]))
                L = math.dist(pos, p1) + math.dist(p1, p2) + math.dist(p2, p3)
                cur += bez(pos, p1, p2, p3, max(2, min(24, int(L / 12)))); pos = p3; i += 6
            else:
                i += 1
        if len(cur) > 2: contours.append(cur)
        out += contours
    return out

def douglas_peucker(pts, tol):
    if len(pts) < 3: return pts
    def rec(a, b):
        if b <= a + 1: return []
        x0, y0 = pts[a]; x1, y1 = pts[b]
        dx, dy = x1 - x0, y1 - y0; L = math.hypot(dx, dy)
        best, bi = -1, -1
        for i in range(a + 1, b):
            px, py = pts[i]
            dist = abs(dy*px - dx*py + x1*y0 - y1*x0) / L if L > 1e-9 else math.dist(pts[i], (x0, y0))
            if dist > best: best, bi = dist, i
        if best <= tol: return []
        return rec(a, bi) + [bi] + rec(bi, b)
    return [pts[i] for i in [0] + rec(0, len(pts) - 1) + [len(pts) - 1]]

def clean(c, min_edge):
    c = list(c); changed = True
    while changed and len(c) > 6:
        changed = False; n = len(c)
        for j in range(n):
            a, b, d = c[(j-1) % n], c[j], c[(j+1) % n]
            v1 = (b[0]-a[0], b[1]-a[1]); v2 = (d[0]-b[0], d[1]-b[1])
            l1 = math.hypot(*v1) or 1; l2 = math.hypot(*v2) or 1
            dot = max(-1, min(1, (v1[0]*v2[0] + v1[1]*v2[1]) / (l1*l2)))
            if math.degrees(math.acos(dot)) < 1.0:
                c.pop(j); changed = True; break
        if changed: continue
        n = len(c)
        for j in range(n):
            a, b = c[j], c[(j+1) % n]
            if math.dist(a, b) < min_edge:
                c[j] = ((a[0]+b[0])/2, (a[1]+b[1])/2); c.pop((j+1) % n); changed = True; break
    return c

# ------------------------------------------------------------------ geometry
def signed_area(c):
    return sum(c[i][0]*c[(i+1) % len(c)][1] - c[(i+1) % len(c)][0]*c[i][1] for i in range(len(c))) / 2

def self_intersects(c):
    n = len(c)
    def o(a, b, p):
        v = (b[0]-a[0])*(p[1]-a[1]) - (b[1]-a[1])*(p[0]-a[0])
        return 0 if abs(v) < 1e-9 else (1 if v > 0 else -1)
    for i in range(n):
        for j in range(i + 2, n):
            if i == 0 and j == n - 1: continue
            p, q, r, s = c[i], c[(i+1) % n], c[j], c[(j+1) % n]
            if o(p, q, r) != o(p, q, s) and o(r, s, p) != o(r, s, q): return True
    return False

def offsets(pts, d, taper_mult, passes):
    """Inward offset vectors. Sharp corners TAPER (capped length) rather than
       spiking to d/sin(half-angle); magnitudes are then smoothed cyclically so
       the taper has no step. Both halves are required to avoid creases."""
    n = len(pts); dirs = []; L = []
    for j in range(n):
        a, b, c = pts[(j-1) % n], pts[j], pts[(j+1) % n]
        e1 = (b[0]-a[0], b[1]-a[1]); l1 = math.hypot(*e1) or 1; e1 = (e1[0]/l1, e1[1]/l1)
        e2 = (c[0]-b[0], c[1]-b[1]); l2 = math.hypot(*e2) or 1; e2 = (e2[0]/l2, e2[1]/l2)
        n1 = (-e1[1], e1[0]); n2 = (-e2[1], e2[0])
        m = (n1[0]+n2[0], n1[1]+n2[1]); lm = math.hypot(*m)
        if lm < 1e-9: m = n1; lm = 1
        m = (m[0]/lm, m[1]/lm)
        sin_b = max(m[0]*n1[0] + m[1]*n1[1], 1e-6)
        dirs.append(m); L.append(min(d / sin_b, d * taper_mult))
    for _ in range(passes):
        L = [0.25*L[(j-1) % n] + 0.5*L[j] + 0.25*L[(j+1) % n] for j in range(n)]
    return [(dirs[j][0]*L[j], dirs[j][1]*L[j]) for j in range(n)]

def earclip(poly):
    n = len(poly); idx = list(range(n)); tris = []
    def cr(o, a, b): return (a[0]-o[0])*(b[1]-o[1]) - (a[1]-o[1])*(b[0]-o[0])
    def inside(p, a, b, c):
        d1, d2, d3 = cr(a, b, p), cr(b, c, p), cr(c, a, p)
        return (d1 >= 0 and d2 >= 0 and d3 >= 0) or (d1 <= 0 and d2 <= 0 and d3 <= 0)
    guard = 0
    while len(idx) > 3 and guard < 50000:
        guard += 1; done = False
        for i in range(len(idx)):
            ia, ib, ic = idx[(i-1) % len(idx)], idx[i], idx[(i+1) % len(idx)]
            a, b, c = poly[ia], poly[ib], poly[ic]
            if cr(a, b, c) <= 0: continue
            if any(inside(poly[j], a, b, c) for j in idx if j not in (ia, ib, ic)): continue
            tris.append((ia, ib, ic)); idx.pop(i); done = True; break
        if not done: break
    if len(idx) == 3: tris.append(tuple(idx))
    return tris

def build():
    cfg = CONFIG
    root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    contours = parse_paths(open(os.path.join(root, cfg["svg"])).read())
    contours = [douglas_peucker(c, cfg["flatten"]) for c in contours]
    contours = [c[:-1] if math.dist(c[0], c[-1]) < 1e-6 else c for c in contours]

    allp = [p for c in contours for p in c]
    xs = [p[0] for p in allp]; ys = [p[1] for p in allp]
    cx = (min(xs)+max(xs))/2; cy = (min(ys)+max(ys))/2
    k = cfg["height"] / (max(ys)-min(ys))
    contours = [[((x-cx)*k, -(y-cy)*k) for x, y in c] for c in contours]
    contours = [c if signed_area(c) > 0 else c[::-1] for c in contours]
    contours = [clean(c, cfg["min_edge"]) for c in contours]

    parts = []
    for c in contours:
        best = None
        for d in [x*0.25 for x in range(4, 33)]:
            off = offsets(c, d, cfg["taper_mult"], cfg["smooth"])
            ok = True
            for fr in (0.25, 0.5, 0.75, 1.0):
                ring = [(c[j][0]+off[j][0]*fr, c[j][1]+off[j][1]*fr) for j in range(len(c))]
                if signed_area(ring) <= 0 or self_intersects(ring): ok = False; break
            if ok: best = (d, off)
            else: break
        d, off = best
        # At a few short edges near sharp corners, two neighbouring points are pushed
        # inward past each other, which folds a sliver of bevel over (a dark tick).
        # Pull each such pair together so the inset edge keeps its direction.
        off = list(off)
        for _ in range(len(c)):
            fixed_any = False
            for j in range(len(c)):
                k = (j+1) % len(c)
                e = (c[k][0]-c[j][0], c[k][1]-c[j][1])
                ij = (c[j][0]+off[j][0], c[j][1]+off[j][1]); ik = (c[k][0]+off[k][0], c[k][1]+off[k][1])
                if (ik[0]-ij[0])*e[0] + (ik[1]-ij[1])*e[1] <= 0:
                    mid = ((ij[0]+ik[0])/2, (ij[1]+ik[1])/2)
                    off[j] = (mid[0] - 0.005*e[0] - c[j][0], mid[1] - 0.005*e[1] - c[j][1])
                    off[k] = (mid[0] + 0.005*e[0] - c[k][0], mid[1] + 0.005*e[1] - c[k][1])
                    fixed_any = True
            if not fixed_any: break
        # Triangulate the INSET outline, which is what the flat faces actually use.
        # Triangulating the original outline and then moving its points inward
        # flipped triangles at the sharp inner corners (the crack where the shafts
        # meet the capital, and dark specks on the faces).
        inset = [(c[j][0]+off[j][0], c[j][1]+off[j][1]) for j in range(len(c))]
        parts.append(dict(pts=c, off=off, inset=d, zr=min(d*1.4, 6.0), tris=earclip(inset)))

    K = cfg["steps"]; h = cfg["half_depth"]
    prof = [((1-math.sin(a)), math.cos(a)) for a in [(i/K)*math.pi/2 for i in range(K+1)]]
    rings = [(f, cz, 1) for f, cz in prof] + [(f, cz, -1) for f, cz in reversed(prof)]

    # verts carry their own normal slot: None = smooth (averaged from the bevel),
    # or a fixed vector for the flat faces, which get vertices of their own so
    # their normals never blend with the bevel's.
    verts, faces, fixed = [], [], []
    for part in parts:
        n = len(part["pts"]); G = len(rings)
        base = len(verts)
        for (fr, cz, sgn) in rings:
            z = sgn * ((h - part["zr"]) + cz * part["zr"])
            for j in range(n):
                px, py = part["pts"][j]; ox, oy = part["off"][j]
                verts.append((px + ox*fr, py + oy*fr, z)); fixed.append(None)
        # the bevel's first and last rings are tangent to the faces: exactly ±z
        for j in range(n):
            fixed[base + j] = (0.0, 0.0, 1.0)
            fixed[base + (G-1)*n + j] = (0.0, 0.0, -1.0)
        for g in range(G-1):
            o1 = base + g*n; o2 = base + (g+1)*n
            for j in range(n):
                a = j; b = (j+1) % n
                faces.append((o1+a, o2+a, o2+b))
                faces.append((o1+a, o2+b, o1+b))
        # flat front and back faces, on their own vertices
        for sgn, ring in ((1, 0), (-1, G-1)):
            cap = len(verts)
            for j in range(n):
                verts.append(verts[base + ring*n + j]); fixed.append((0.0, 0.0, float(sgn)))
            for (a, b, c) in part["tris"]:
                faces.append((cap+a, cap+b, cap+c) if sgn > 0 else (cap+a, cap+c, cap+b))
    build.fixed = fixed
    return verts, faces, parts

def normals_for(verts, faces, fixed=None):
    """Area-weighted smooth normals, except where `fixed` gives a vector."""
    acc = [[0.0, 0.0, 0.0] for _ in verts]
    for (i0, i1, i2) in faces:
        a, b, c = verts[i0], verts[i1], verts[i2]
        u = (b[0]-a[0], b[1]-a[1], b[2]-a[2]); v = (c[0]-a[0], c[1]-a[1], c[2]-a[2])
        nx = u[1]*v[2] - u[2]*v[1]; ny = u[2]*v[0] - u[0]*v[2]; nz = u[0]*v[1] - u[1]*v[0]
        for i in (i0, i1, i2):
            acc[i][0] += nx; acc[i][1] += ny; acc[i][2] += nz
    out = []
    for i, n in enumerate(acc):
        if fixed and fixed[i] is not None:
            out.append(fixed[i]); continue
        L = math.sqrt(n[0]**2 + n[1]**2 + n[2]**2) or 1.0
        out.append((n[0]/L, n[1]/L, n[2]/L))
    return out

def auto_smooth(verts, faces, fixed, crease_deg):
    """Per-corner normals: a corner averages only the neighbouring faces within
       `crease_deg` of its own face, so walls that meet at a sharp corner of the
       outline get a crisp edge instead of one compromise normal that shades one
       wall dark. Returns new (verts, faces, normals), splitting vertices as needed."""
    fn = []
    for (i0, i1, i2) in faces:
        a, b, c = verts[i0], verts[i1], verts[i2]
        u = (b[0]-a[0], b[1]-a[1], b[2]-a[2]); v = (c[0]-a[0], c[1]-a[1], c[2]-a[2])
        n = (u[1]*v[2] - u[2]*v[1], u[2]*v[0] - u[0]*v[2], u[0]*v[1] - u[1]*v[0])
        L = math.sqrt(n[0]**2 + n[1]**2 + n[2]**2)
        fn.append((n, (n[0]/L, n[1]/L, n[2]/L) if L > 1e-12 else (0.0, 0.0, 0.0)))
    around = [[] for _ in verts]
    for f, tri in enumerate(faces):
        for i in tri: around[i].append(f)
    # Drop tiny slivers folded the wrong way at concave corners (well under a unit;
    # their neighbours already cover the spot). Kept, they shade as dark specks.
    def folded(f):
        n, u = fn[f]
        if math.sqrt(n[0]**2 + n[1]**2 + n[2]**2) / 2 >= 2.0: return False
        s = [0.0, 0.0, 0.0]
        for i in faces[f]:
            ref = fixed[i]
            if ref is None:
                for g in around[i]:
                    if g != f: s = [s[k] + fn[g][1][k] for k in range(3)]
            else:
                s = [s[k] + ref[k] for k in range(3)]
        return u[0]*s[0] + u[1]*s[1] + u[2]*s[2] < 0
    keep = [f for f in range(len(faces)) if not folded(f)]
    faces = [faces[f] for f in keep]; fn = [fn[f] for f in keep]
    around = [[] for _ in verts]
    for f, tri in enumerate(faces):
        for i in tri: around[i].append(f)
    cos_c = math.cos(math.radians(crease_deg))
    new_verts, new_norms, new_faces, seen = [], [], [], {}
    for f, tri in enumerate(faces):
        out = []
        for i in tri:
            if fixed[i] is not None:
                n = fixed[i]
            else:
                uf = fn[f][1]; s = [0.0, 0.0, 0.0]
                for g in around[i]:
                    ug = fn[g][1]
                    if uf[0]*ug[0] + uf[1]*ug[1] + uf[2]*ug[2] >= cos_c:
                        w = fn[g][0]; s[0] += w[0]; s[1] += w[1]; s[2] += w[2]
                L = math.sqrt(s[0]**2 + s[1]**2 + s[2]**2) or 1.0
                n = (s[0]/L, s[1]/L, s[2]/L)
            key = (i, round(n[0], 4), round(n[1], 4), round(n[2], 4))
            if key not in seen:
                seen[key] = len(new_verts); new_verts.append(verts[i]); new_norms.append(n)
            out.append(seen[key])
        new_faces.append(tuple(out))
    return new_verts, new_faces, new_norms

def write_glb(path, verts, faces, norms, cfg):
    idx = [i for tri in faces for i in tri]
    ib = struct.pack("<%dI" % len(idx), *idx)
    pb = struct.pack("<%df" % (len(verts)*3), *[c for v in verts for c in v])
    nb = struct.pack("<%df" % (len(norms)*3), *[c for n in norms for c in n])
    def pad(b, fill=b"\x00"):
        r = (-len(b)) % 4
        return b + fill*r
    ib_p, pb_p, nb_p = pad(ib), pad(pb), pad(nb)
    bin_chunk = ib_p + pb_p + nb_p
    xs = [v[0] for v in verts]; ys = [v[1] for v in verts]; zs = [v[2] for v in verts]
    hexcol = cfg["base_color"].lstrip("#")
    srgb = [int(hexcol[i:i+2], 16)/255 for i in (0, 2, 4)]
    lin = [((c/12.92) if c <= 0.04045 else (((c+0.055)/1.055)**2.4)) for c in srgb]
    gltf = {
        "asset": {"version": "2.0", "generator": "melange build-mark-mesh.py"},
        "scene": 0,
        "scenes": [{"nodes": [0]}],
        "nodes": [{"mesh": 0, "name": "Melange Mark"}],
        "meshes": [{"name": "Melange Mark",
                    "primitives": [{"attributes": {"POSITION": 1, "NORMAL": 2},
                                    "indices": 0, "material": 0}]}],
        "materials": [{"name": "Melange Silver",
                       "pbrMetallicRoughness": {
                           "baseColorFactor": lin + [1.0],
                           "metallicFactor": cfg["metallic"],
                           "roughnessFactor": cfg["roughness"]},
                       "doubleSided": False}],
        "buffers": [{"byteLength": len(bin_chunk)}],
        "bufferViews": [
            {"buffer": 0, "byteOffset": 0,                          "byteLength": len(ib), "target": 34963},
            {"buffer": 0, "byteOffset": len(ib_p),                  "byteLength": len(pb), "target": 34962},
            {"buffer": 0, "byteOffset": len(ib_p)+len(pb_p),        "byteLength": len(nb), "target": 34962},
        ],
        "accessors": [
            {"bufferView": 0, "componentType": 5125, "count": len(idx),   "type": "SCALAR",
             "min": [0], "max": [len(verts)-1]},
            {"bufferView": 1, "componentType": 5126, "count": len(verts), "type": "VEC3",
             "min": [min(xs), min(ys), min(zs)], "max": [max(xs), max(ys), max(zs)]},
            {"bufferView": 2, "componentType": 5126, "count": len(norms), "type": "VEC3"},
        ],
    }
    js = pad(json.dumps(gltf, separators=(",", ":")).encode("utf-8"), b" ")
    total = 12 + 8 + len(js) + 8 + len(bin_chunk)
    with open(path, "wb") as f:
        f.write(struct.pack("<III", 0x46546C67, 2, total))
        f.write(struct.pack("<II", len(js), 0x4E4F534A)); f.write(js)
        f.write(struct.pack("<II", len(bin_chunk), 0x004E4942)); f.write(bin_chunk)
    return total

if __name__ == "__main__":
    root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    verts, faces, parts = build()
    verts, faces, norms = auto_smooth(verts, faces, build.fixed, CONFIG["crease"])
    out = os.path.join(root, CONFIG["out"])
    size = write_glb(out, verts, faces, norms, CONFIG)
    print("contours :", len(parts), [len(p["pts"]) for p in parts])
    print("bevels   :", [(round(p["inset"], 2), round(p["zr"], 2)) for p in parts])
    print("vertices :", len(verts))
    print("triangles:", len(faces))
    print("glb      :", out, "(%.1f KB)" % (size/1024))
