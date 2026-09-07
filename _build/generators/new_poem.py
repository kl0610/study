"""Build the next fortnight's recitation app from this one's shell.

    python new_poem.py poem_owl.json wise-old-owl

The poem changes every two weeks, and the app around it does not: the five
levels, the marking, the pictures-on-a-miss and the way out of a line you
cannot remember are all the same whatever the poem is. So the shell is taken
from the newest recitation app and only its DATA block is replaced — the same
arrangement the science and history chapters use.

The pictures are the one part that cannot be generated. A poem's ART block is
drawn by hand into the shell, and a spec naming an `art` key that the shell has
no drawing for is refused rather than shipped: a level whose only cue is a
missing picture is the level that teaches nothing.
"""
import io
import json
import os
import re
import sys

ROOT = r"C:\Users\kl\projects\study"
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(ROOT, "_build"))
# build_theme reads sys.argv at import time for its own flags, so ours are put
# aside first — gen_history threw its own away doing this and quietly rebuilt
# the wrong chapter every run.
MINE = sys.argv[1:]
sys.argv = ["x"]
import build_theme as B          # noqa: E402

SHELL = os.path.join(ROOT, "recitation", "wise-old-owl", "index.html")

MODES = ["last", "first", "half", "line", "heart"]


def span(html, name):
    """The bounds of a top-level `const NAME = {...};` object."""
    i = html.index("const %s = " % name)
    b = html.index("{", i)
    d = 0
    for j in range(b, len(html)):
        if html[j] == "{":
            d += 1
        elif html[j] == "}":
            d -= 1
            if not d:
                return b, j + 1
    raise SystemExit("unbalanced %s" % name)


def check(spec, art):
    """The faults worth catching before a ten-year-old finds them."""
    bad = []
    lines = spec.get("lines") or []
    if len(lines) < 2:
        bad.append("a poem needs at least two lines")
    for i, ln in enumerate(lines, 1):
        if not ln.get("t", "").strip():
            bad.append("line %d is empty" % i)
        if not ln.get("art"):
            bad.append("line %d has no picture" % i)
        elif ln["art"] not in art:
            bad.append("line %d wants a picture called %r, which is not drawn "
                       "in the shell" % (i, ln["art"]))
        # A line whose words are all punctuation cannot be typed back.
        if not re.search(r"[A-Za-z0-9]", ln.get("t", "")):
            bad.append("line %d has nothing to type" % i)

    ids = [l.get("id") for l in spec.get("levels", [])]
    if ids != ["l1", "l2", "l3", "l4", "l5"]:
        bad.append("the levels must be l1..l5 — the hub and the dragon name them")
    modes = [l.get("mode") for l in spec.get("levels", [])]
    if modes != MODES:
        bad.append("the ladder must run %s, got %s" % (MODES, modes))
    if sum(1 for l in spec.get("levels", []) if l.get("boss")) != 1:
        bad.append("exactly one level is the boss, and it should be the last")

    for f in ("title", "plain", "eyebrow", "sub", "source"):
        if not spec.get(f):
            bad.append("no %s" % f)
    if bad:
        raise SystemExit("  refusing to build:\n    " + "\n    ".join(bad))


def main():
    if len(MINE) < 2:
        raise SystemExit("usage: new_poem.py <spec.json> <out-dir-name>")
    spec = json.load(io.open(os.path.join(HERE, MINE[0]), encoding="utf-8"))
    out_dir = MINE[1]

    src = io.open(SHELL, encoding="utf-8").read()
    shell = B.strip_theme(src)
    if shell is None:
        raise SystemExit("could not strip the theme off the shell")

    ab, ae = span(shell, "ART")
    art = set(re.findall(r"^(\w+):\s*`<svg", shell[ab:ae], re.M))
    check(spec, art)

    db, de = span(shell, "DATA")
    out = shell[:db] + json.dumps(spec, ensure_ascii=False, indent=1) + shell[de:]

    out = re.sub(r"<title>.*?</title>",
                 "<title>%s &mdash; Recitation</title>" % spec["plain"], out, count=1)

    d = os.path.join(ROOT, "recitation", out_dir)
    os.makedirs(d, exist_ok=True)
    io.open(os.path.join(d, "index.html"), "w", encoding="utf-8",
            newline="\r\n").write(out)

    print("  recitation/%s  %d lines  %.1f KB" % (out_dir, len(spec["lines"]), len(out) / 1024))
    print("    pictures available in the shell: %s" % ", ".join(sorted(art)))
    print("    next: add it to APPS in build_theme.py and to the hub, then rebuild")


main()
