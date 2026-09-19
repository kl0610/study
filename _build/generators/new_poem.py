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
            bad.append("line %d wants a picture called %r, which nothing has "
                       "drawn" % (i, ln["art"]))
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

    for lv in spec.get("levels", []):
        if lv.get("art") and lv["art"] != "always":
            bad.append("%s: art is %r; the only setting is \"always\"" % (lv.get("id"), lv["art"]))
        # By heart already shows the picture, and it is the only thing on the
        # screen there. Asking for it twice is a spec that has not been read.
        if lv.get("mode") == "heart" and lv.get("art"):
            bad.append("%s is By heart, which shows the picture anyway" % lv.get("id"))

    for f in ("title", "plain", "eyebrow", "sub", "source"):
        if not spec.get(f):
            bad.append("no %s" % f)
    if bad:
        raise SystemExit("  refusing to build:\n    " + "\n    ".join(bad))


OLD_ART = """    box.innerHTML = "";
    return;
  }
  const ln = DATA.lines[SHOWART];"""

NEW_ART = """    /* On every level before By heart the picture is a companion rather than a
       hint: it stands beside the line being worked on from the first attempt,
       not only after a miss. The point of the last level is that a drawing is
       enough on its own to call a line back — which it can only be if the two
       have been seen together all the way up. Levels ask for this with
       art:"always"; By heart has its own branch above and does not. */
    if (LVL().art === "always" && BL.length){
      let li = -1;
      for (let k = 0; k < BL.length; k++) if (!ST[k].done){ li = BL[k].li; break; }
      if (li < 0) li = BL[BL.length - 1].li;
      const cur = DATA.lines[li];
      box.innerHTML = '<div class="artbox">' + (ART[cur.art] || "") +
        '<p class="artcap">Line ' + (li + 1) + "</p>" +
        (shownLine(li) ? '<p class="artline">' + esc(cur.t) + "</p>" : "") + "</div>";
      return;
    }
    box.innerHTML = "";
    return;
  }
  const ln = DATA.lines[SHOWART];"""


def show_art_always(out):
    """Teach the shell to keep a picture on screen through the early levels.

    Idempotent: once a shell carries the new branch there is nothing to do, so
    a poem generated from a poem that already has it is not patched twice.
    """
    if "LVL().art === \"always\"" in out:
        return out, "already there"
    if out.count(OLD_ART) != 1:
        raise SystemExit("  paintArt is not the shape this patch expects")
    return out.replace(OLD_ART, NEW_ART, 1), "patched in"


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
    db, de = span(shell, "DATA")

    # A poem brings its own pictures. The shell's are the last poem's and mean
    # nothing here — an eagle on a crag is not an owl in an oak — so a spec that
    # carries an `art` block replaces them outright, and it is that block the
    # lines are checked against. A spec without one keeps the shell's, which is
    # what a second poem about the same things would want.
    own = spec.pop("art", None)
    art = set(own) if own else set(re.findall(r"^(\w+):\s*`<svg", shell[ab:ae], re.M))
    check(spec, art)

    # DATA sits after ART in the file, so it is replaced first and the ART
    # offsets stay where they were.
    out = shell[:db] + json.dumps(spec, ensure_ascii=False, indent=1) + shell[de:]
    if own:
        drawn = "{\n\n" + "\n\n".join(
            "%s: `%s`," % (k, own[k].strip()) for k in own) + "\n\n}"
        out = out[:ab] + drawn + out[ae:]

    out, art_state = show_art_always(out)

    out = re.sub(r"<title>.*?</title>",
                 "<title>%s &mdash; Recitation</title>" % spec["plain"], out, count=1)

    d = os.path.join(ROOT, "recitation", out_dir)
    os.makedirs(d, exist_ok=True)
    io.open(os.path.join(d, "index.html"), "w", encoding="utf-8",
            newline="\r\n").write(out)

    print("  recitation/%s  %d lines  %.1f KB" % (out_dir, len(spec["lines"]), len(out) / 1024))
    print("    pictures %s: %s"
          % ("drawn for this poem" if own else "kept from the shell", ", ".join(sorted(art))))
    unused = sorted(art - {ln["art"] for ln in spec["lines"]})
    if unused:
        print("    note: nothing uses %s" % ", ".join(unused))
    early = [l["id"] for l in spec["levels"] if l.get("art") == "always"]
    print("    picture always on screen for %s (%s)"
          % (", ".join(early) if early else "no level", art_state))
    print("    next: add it to APPS in build_theme.py and to the hub, then rebuild")


main()
