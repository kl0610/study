"""Build the Word List 2 matching sheet from Word List 1's sheet.

The sheet is the study tool, not the test: every word on the list matched to
every meaning it carries. List 1 grouped its rounds by how many jobs a word
does. List 2 has 21 word forms across 33 meanings, which is too many for three
rounds, so it splits into four — and the derived forms (arrogance, degrading,
integration, segregation, triumphant, violation) get a round of their own,
because seeing them beside their roots is the point of them being on the list.
"""
import io, json, os, re, sys

ROOT = r"C:\Users\kl\projects\study"
SCRATCH = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(ROOT, "_build"))
# build_theme reads sys.argv at import time for its own flags, so ours are put
# aside first and put back after. Doing it the other way round threw them away.
MINE = sys.argv[1:]
sys.argv = ["x"]
import build_theme as B
import vocabspec


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


# The rounds come from the week's spec now. They were a constant here, naming
# List 2's words, which meant a new list could not be built without editing this
# file — and a round naming a word that is not on the list is caught below.


def main():
    """usage: gen_sheet.py <spec.json> <out-dir> [shell-dir]"""
    if len(MINE) < 2:
        raise SystemExit("usage: gen_sheet.py <spec.json> <out-dir> [shell-dir]")
    spec_name, out_dir = MINE[0], MINE[1]
    shell_dir = MINE[2] if len(MINE) > 2 else "ww6-lesson2"

    src = io.open(os.path.join(ROOT, "vocabulary", shell_dir, "index.html"),
                  encoding="utf-8").read()
    shell = B.strip_theme(src)
    if shell is None:
        raise SystemExit("could not strip the theme off %s" % shell_dir)

    spec = json.load(io.open(os.path.join(SCRATCH, spec_name), encoding="utf-8"))
    vocabspec.check(spec)
    senses = spec["senses"]
    ROUNDS = [(r["id"], r["name"], r["blurb"], r["words"]) for r in spec["rounds"]]

    by_word = {}
    order = []
    for s in senses:
        if s["w"] not in by_word:
            by_word[s["w"]] = []
            order.append(s["w"])
        by_word[s["w"]].append([s["pos"], s["def"]])

    lst = [{"w": w, "entries": by_word[w]} for w in order]

    rounds, seen = [], set()
    for rid, name, blurb, words in ROUNDS:
        items = []
        for w in words:
            if w not in by_word:
                raise SystemExit("round %s names a word not on the list: %s" % (rid, w))
            for pos, d in by_word[w]:
                items.append([w, pos, d])
            seen.add(w)
        rounds.append({"id": rid, "name": name, "blurb": blurb, "items": items})

    missing = [w for w in order if w not in seen]
    if missing:
        raise SystemExit("these words are on no round: %s" % ", ".join(missing))

    total = sum(len(r["items"]) for r in rounds)
    if total != len(senses):
        raise SystemExit("rounds cover %d meanings but the list has %d" % (total, len(senses)))

    data = {"book": spec["book"], "lesson": spec["lesson"], "list": lst, "rounds": rounds}

    b, e = data_span(shell)
    out = shell[:b] + json.dumps(data, ensure_ascii=False, indent=1) + shell[e:]
    out = re.sub(r"<title>.*?</title>",
                 "<title>%s \u2014 all the meanings</title>" % spec["lesson"], out, count=1)

    # Same reason as the test app: the sheet's headings are markup, and would
    # otherwise go on naming the list it was built from. Both of them — List 2's
    # sheet has carried "Word List 1" in its title since the day it shipped,
    # because only the smaller heading was ever being substituted.
    out, n = re.subn(r"<h3>Word List \d+</h3>", "<h3>%s</h3>" % spec["lesson"], out, count=1)
    if not n:
        raise SystemExit("the sheet's heading is not where it was")

    m = re.search(r"(\d+)", spec["lesson"])
    h1 = ("<h1>Word <em>List %s</em></h1>" % m.group(1) if m
          else "<h1><em>%s</em></h1>" % spec["lesson"])
    out, n = re.subn(r"<h1>.*?</h1>", h1, out, count=1, flags=re.S)
    if not n:
        raise SystemExit("the sheet's title is not where it was")

    d = os.path.join(ROOT, "vocabulary", out_dir)
    os.makedirs(d, exist_ok=True)
    io.open(os.path.join(d, "index.html"), "w", encoding="utf-8", newline="\r\n").write(out)
    print("  %d word forms, %d meanings" % (len(lst), total))
    for r in rounds:
        print("    %-3s %-24s %2d meanings" % (r["id"], r["name"], len(r["items"])))
    print("  wrote %.1f KB" % (len(out) / 1024))


main()
