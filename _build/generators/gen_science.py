"""Build a CKSci chapter app from the newest chapter's shell.

    python gen_science.py science_ch5.json g5-matter-ch5

gen_ch4.py did this for one chapter with the paths written into it, which was
fine for one chapter and no use for the next two. This is the same thing with
the chapter named on the command line, and with the checks that the history
generator grew after they caught real faults there.

The shell is Chapter 4's, because it is the one carrying the three-column bin
fix and the passage highlighter. Its DATA is replaced wholesale; everything else
— the render functions, the drawer, the theme — comes across untouched.
"""
import io
import json
import os
import random
import re
import sys

RNG = random.Random(20260902)   # deterministic build; the app reshuffles at render

ROOT = r"C:\Users\kl\projects\study"
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(ROOT, "_build"))
# build_theme reads sys.argv at import time for its own flags, so hide ours from
# it and put them back — gen_history threw its own away doing this, and every
# run quietly rebuilt whatever the defaults named.
MINE = sys.argv[1:]
sys.argv = ["x"]
import build_theme as B          # noqa: E402


def data_span(html):
    i = html.index("const DATA = ")
    b = html.index("{", i)
    d = 0
    for j in range(b, len(html)):
        if html[j] == "{":
            d += 1
        elif html[j] == "}":
            d -= 1
            if not d:
                return b, j + 1
    raise SystemExit("unbalanced DATA")


def check(spec):
    """The faults worth catching before a ten-year-old finds them."""
    bad = []
    keys = set(spec["passages"])
    for n, it in enumerate(spec["items"], 1):
        where = "q%d (%s)" % (n, it["type"])
        if it.get("p") not in keys:
            bad.append("%s: no passage %r" % (where, it.get("p")))
        if not it.get("why"):
            bad.append("%s: no explanation" % where)
        if it["type"] == "pick":
            o = it.get("opts") or []
            if len(o) != 4:
                bad.append("%s: %d options, want 4" % (where, len(o)))
            if len(set(o)) != len(o):
                bad.append("%s: a repeated option" % where)
            if not isinstance(it.get("a"), int) or not 0 <= it["a"] < len(o):
                bad.append("%s: answer index out of range" % where)
            else:
                # The tell that matters: a child who notices the right answer is
                # always the longest one stops reading the question.
                lens = [len(x) for x in o]
                if lens[it["a"]] == max(lens) and max(lens) - sorted(lens)[-2] >= 6:
                    bad.append("%s: correct option is the longest by %d characters"
                               % (where, max(lens) - sorted(lens)[-2]))
        if it["type"] == "selectall":
            o = it.get("opts") or []
            if not any(x[1] for x in o):
                bad.append("%s: nothing is correct" % where)
            if all(x[1] for x in o):
                bad.append("%s: everything is correct" % where)
        if it["type"] == "sort":
            if len(it.get("bins", [])) < 2:
                bad.append("%s: needs at least two bins" % where)
            for c in it.get("chips", []):
                if not 0 <= c[1] < len(it["bins"]):
                    bad.append("%s: chip %r points at no bin" % (where, c[0][:30]))
        if it["type"] == "match":
            if len(it.get("pairs", [])) < 3:
                bad.append("%s: needs at least three pairs" % where)

    for k, P in spec["passages"].items():
        if not P.get("title") or not P.get("cite") or not P.get("text"):
            bad.append("passage %r is missing title, cite or text" % k)
    unused = keys - {it.get("p") for it in spec["items"]}
    for k in sorted(unused):
        print("    note: passage %r is not used by any question" % k)
    if bad:
        raise SystemExit("  refusing to build:\n    " + "\n    ".join(bad))


def spread(spec):
    """Shuffle each question's options so the answer index is not clustered.

    The app reshuffles at render, so this changes nothing a child sees — but the
    source is what the next person reads, and written out by hand these land on
    index 0 nearly every time.
    """
    for it in spec["items"]:
        if it["type"] != "pick":
            continue
        right = it["opts"][it["a"]]
        RNG.shuffle(it["opts"])
        it["a"] = it["opts"].index(right)


def main():
    spec_name = MINE[0] if MINE else "science_ch5.json"
    out_dir = MINE[1] if len(MINE) > 1 else "g5-matter-ch5"
    spec = json.load(io.open(os.path.join(HERE, spec_name), encoding="utf-8"))
    spread(spec)
    check(spec)

    src = io.open(os.path.join(ROOT, "science", "g5-matter-ch4", "index.html"),
                  encoding="utf-8").read()
    shell = B.strip_theme(src)
    if shell is None:
        raise SystemExit("could not strip the theme off Chapter 4")

    b, e = data_span(shell)
    old = json.loads(shell[b:e])
    data = {
        "chapter": spec["chapter"],
        "bigQuestion": spec["bigQuestion"],
        "passages": spec["passages"],
        "videos": spec.get("videos") or old.get("videos", []),
        "missions": [{
            "id": "m1",
            "name": spec["mission"]["name"],
            "tag": spec["mission"]["tag"],
            "blurb": spec["mission"]["blurb"],
            "items": spec["items"],
        }],
    }
    out = shell[:b] + json.dumps(data, ensure_ascii=False, indent=1) + shell[e:]
    out = re.sub(r"<title>.*?</title>", "<title>%s</title>" % spec["title"], out, count=1)

    # The header is markup, not data, so a chapter cloned from another one keeps
    # its name until told otherwise. Chapter 4 of History shipped introducing
    # itself as Chapter 3 for exactly this reason.
    if spec.get("eyebrow"):
        out, n = re.subn(r'<div class="eyebrow">[^<]*</div>',
                         '<div class="eyebrow">%s</div>' % spec["eyebrow"], out, count=1)
        if not n:
            raise SystemExit("the eyebrow is not where it was")
    if spec.get("h1"):
        out, n = re.subn(r"<h1>.*?</h1>", "<h1>%s</h1>" % spec["h1"], out, count=1, flags=re.S)
        if not n:
            raise SystemExit("the h1 is not where it was")
    out, n = re.subn(r'(<div class="eyebrow">The Big Question</div>\s*<p>)[^<]*(</p>)',
                     lambda m: m.group(1) + spec["bigQuestion"] + m.group(2), out, count=1)
    if not n:
        raise SystemExit("the Big Question block is not where it was")

    d = os.path.join(ROOT, "science", out_dir)
    os.makedirs(d, exist_ok=True)
    io.open(os.path.join(d, "index.html"), "w", encoding="utf-8", newline="\r\n").write(out)

    kinds = {}
    for i in spec["items"]:
        kinds[i["type"]] = kinds.get(i["type"], 0) + 1
    print("  science/%s  %d questions  %.1f KB" % (out_dir, len(spec["items"]), len(out) / 1024))
    print("    %s" % " ".join("%s:%d" % kv for kv in sorted(kinds.items())))
    print("    %d passages" % len(spec["passages"]))


main()
