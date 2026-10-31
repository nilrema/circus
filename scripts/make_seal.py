#!/usr/bin/env python3
"""Generate a Circus edition seal (a curvy 10-point star) as an SVG path.

Reverse-engineered from the existing seals in assets/CircusSeals/*.svg:

  * 10 outer points -> 20 alternating nodes, 18 degrees apart, as 20 cubic
    Bezier segments (M + 20 x C).
  * Even nodes sit on the outer radius, odd nodes on the inner radius.
  * Every node carries one handle, given as (radial, tangential) offsets from
    the node. The outgoing handle uses (radial, +tangential); the incoming
    handle mirrors it with (radial, -tangential). Outer and inner nodes have
    their own pair of numbers.
  * The whole star is rotated by `rotation` degrees and scaled by `scale`
    (the original generator's fixed layers: translate(500,500) rotate(r)
    scale(s) rotate(0) scale(1), viewBox 0 0 1000 1000).

Usage:
    scripts/make_seal.py --verify          # re-create star-5.svg and compare
    scripts/make_seal.py --outer 240 --inner 108 --outer-handle -60 140 \\
        --inner-handle 120 -90 --rotation 73 --scale 1.4 -o out.svg
"""
import argparse
import math
import re
import sys

POINTS = 10  # outer points; 2 * POINTS nodes


def fmt(v):
    """Match the repr style of the original exports (no trailing '.0')."""
    s = repr(float(v))
    if s.endswith(".0"):
        s = s[:-2]
    return "0" if s == "-0" else s


def build_path(outer, inner, outer_handle, inner_handle, points=POINTS):
    nodes = 2 * points
    step = 2 * math.pi / nodes

    def frame(k):
        a = k * step
        return a, (math.cos(a), math.sin(a)), (-math.sin(a), math.cos(a))

    def node(k):
        a, er, _ = frame(k)
        r = outer if k % 2 == 0 else inner
        return (r * er[0], r * er[1])

    def handle(k, sign):
        a, er, et = frame(k)
        base = node(k)
        rad, tan = outer_handle if k % 2 == 0 else inner_handle
        return (base[0] + rad * er[0] + sign * tan * et[0],
                base[1] + rad * er[1] + sign * tan * et[1])

    start = node(0)
    parts = ["M %s %s" % (fmt(start[0]), fmt(start[1]))]
    for k in range(nodes):
        c1 = handle(k, +1)
        c2 = handle(k + 1, -1)
        end = node(k + 1)
        parts.append("C %s %s, %s %s, %s %s" % (
            fmt(c1[0]), fmt(c1[1]), fmt(c2[0]), fmt(c2[1]), fmt(end[0]), fmt(end[1])))
    parts.append("Z")
    return " ".join(parts)


def build_svg(path, rotation, scale, fill="#FF0000"):
    return (
        '<svg xmlns="http://www.w3.org/2000/svg" id="star-svg" viewBox="0 0 1000 1000" '
        'class="_svg_15f9g_10"><g transform="translate(500, 500) rotate(%s)">'
        '<g transform="scale(%s)" opacity="1"><g transform="rotate(0) scale(1)" opacity="1">'
        '<path d="%s" fill="%s" stroke="#000000" stroke-width="12" stroke-linejoin="round"/>'
        '</g></g></g></svg>' % (fmt(rotation), fmt(scale), path, fill))


def parse_path(d):
    nums = [float(x) for x in re.findall(r"[-+]?\d*\.?\d+(?:[eE][-+]?\d+)?", d)]
    return list(zip(nums[0::2], nums[1::2]))


def verify():
    """Rebuild star-5 from its measured parameters and diff against the file."""
    src = open("assets/CircusSeals/star-5.svg").read()
    ref = parse_path(re.search(r' d="([^"]+)"', src).group(1))
    got = parse_path(build_path(230, 126.5, (-79.76, -109.78), (175.75, 181.99)))
    # handles were rounded to 2 dp above; recompute exact values from the file
    def local(nodept, cp):
        a = math.atan2(nodept[1], nodept[0])
        dx, dy = cp[0] - nodept[0], cp[1] - nodept[1]
        return (dx * math.cos(a) + dy * math.sin(a), -dx * math.sin(a) + dy * math.cos(a))
    oh = local(ref[0], ref[1])
    ih = local(ref[3], ref[4])
    got = parse_path(build_path(230, 126.5, oh, ih))
    err = max(math.dist(a, b) for a, b in zip(ref, got))
    print("star-5: outer handle=(%.4f, %.4f) inner handle=(%.4f, %.4f)" % (oh + ih))
    print("points compared: %d, max deviation: %.6f" % (len(ref), err))
    return 0 if err < 1e-6 and len(ref) == len(got) else 1


def main():
    p = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    p.add_argument("--verify", action="store_true")
    p.add_argument("--outer", type=float, default=230)
    p.add_argument("--inner", type=float, default=126.5)
    p.add_argument("--outer-handle", type=float, nargs=2, default=(-79.76, -109.78), metavar=("RAD", "TAN"))
    p.add_argument("--inner-handle", type=float, nargs=2, default=(175.75, 181.99), metavar=("RAD", "TAN"))
    p.add_argument("--rotation", type=float, default=0)
    p.add_argument("--scale", type=float, default=1.0)
    p.add_argument("--fill", default="#FF0000")
    p.add_argument("-o", "--output")
    a = p.parse_args()
    if a.verify:
        sys.exit(verify())
    svg = build_svg(build_path(a.outer, a.inner, a.outer_handle, a.inner_handle), a.rotation, a.scale, a.fill)
    if a.output:
        open(a.output, "w").write(svg)
    else:
        print(svg)


if __name__ == "__main__":
    main()
