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
sys.argv = ["x"]
import build_theme as B


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


ROUNDS = [
    ("r1", "One meaning each", "Seven words that mean exactly one thing.",
     ["ceremony", "detain", "vacate", "arrogant", "degrade", "integrate", "segregate"]),
    ("r2", "Word families", "The same root doing a different job in the sentence.",
     ["arrogance", "degrading", "integration", "segregation", "triumphant", "violation"]),
    ("r3", "Words that do two jobs", "Five words, two meanings each. Read both before you match.",
     ["boycott", "custody", "supreme", "verdict", "violate"]),
    ("r4", "The tricky ones", "Three words carrying three and four meanings between them.",
     ["campaign", "triumph", "extend"]),
]


def main():
    src = io.open(os.path.join(ROOT, "vocabulary", "ww6-lesson1", "index.html"),
                  encoding="utf-8").read()
    shell = B.strip_theme(src)
    if shell is None:
        raise SystemExit("could not strip the theme off the List 1 sheet")

    spec = json.load(io.open(os.path.join(SCRATCH, "ww6_l2.json"), encoding="utf-8"))
    senses = spec["senses"]

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
                 "<title>Word List 2 \u2014 all the meanings</title>", out, count=1)

    d = os.path.join(ROOT, "vocabulary", "ww6-lesson2")
    os.makedirs(d, exist_ok=True)
    io.open(os.path.join(d, "index.html"), "w", encoding="utf-8", newline="\r\n").write(out)
    print("  %d word forms, %d meanings" % (len(lst), total))
    for r in rounds:
        print("    %-3s %-24s %2d meanings" % (r["id"], r["name"], len(r["items"])))
    print("  wrote %.1f KB" % (len(out) / 1024))


main()
