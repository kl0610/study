"""Build the Age of Exploration explorer review from a spec.

    python gen_explorers.py explorers_ae.json ae-explorers

Ten explorers, two per country, two questions each in the multiple choice and
a "who said it" round where the same name can be the answer more than once.
Every item carries a hint and the printed page in the Student Reader, because
the point is not to score him but to send him back to the right page.

WHAT THIS REFUSES TO SHIP. The checks below are the ones that matter for a
test tomorrow: a question whose answer can be guessed without knowing the
book, and a question the book does not support.

  - the correct option is never the longest, except where the option list is
    the same closed set every time (the five countries, the ten names). There
    the longest option appears in every question and is right only twice in
    ten, so length tells him nothing, and forcing the rule would mean never
    being able to ask about the Netherlands.
  - the answer never appears in the question itself
  - every explorer is asked about in both rounds, and every country appears
  - a name offered as an answer is one of the ten
  - every item has a hint and a page, and the page is inside the reader
"""
import io, json, os, re, sys

ROOT = r"C:\Users\kl\projects\study"
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(ROOT, "_build"))
MINE = sys.argv[1:]
sys.argv = ["x"]
import build_theme as B                                           # noqa: E402

PAGES = (1, 99)          # the Student Reader's printed page range


def bare(s):
    return re.sub(r"[^a-z0-9]", "", str(s).lower())


def check(spec):
    bad = []
    for f in ("title", "sub", "cite", "note", "countries", "explorers", "quizzes"):
        if not spec.get(f):
            bad.append("no %s" % f)
    if bad:
        raise SystemExit("  refusing to build:\n    " + "\n    ".join(bad))

    names = [e["name"] for e in spec["explorers"]]
    if len(set(names)) != len(names):
        bad.append("two explorers share a name")
    for e in spec["explorers"]:
        if e["country"] not in spec["countries"]:
            bad.append("%s sails for %r, which is not in the country list"
                       % (e["name"], e["country"]))
        if not (PAGES[0] <= e.get("page", 0) <= PAGES[1]):
            bad.append("%s cites page %r, which is not in the reader"
                       % (e["name"], e.get("page")))
    # Two from each country was the whole brief.
    for c in spec["countries"]:
        n = sum(1 for e in spec["explorers"] if e["country"] == c)
        if n != 2:
            bad.append("%s has %d explorer(s), and the brief is two from each" % (c, n))

    for q in spec["quizzes"]:
        where = q["id"]
        asked = set()
        spread = set()
        for it in q["items"]:
            stem = it["q"]
            if not it.get("hint"):
                bad.append("%s: %r has no hint" % (where, stem[:40]))
            if not (PAGES[0] <= it.get("page", 0) <= PAGES[1]):
                bad.append("%s: %r cites page %r" % (where, stem[:40], it.get("page")))
            if not it.get("why"):
                bad.append("%s: %r never says why" % (where, stem[:40]))

            if q["mode"] == "name":
                ans = it["a"]
                if ans not in names:
                    bad.append("%s: %r answers %r, who is not one of the ten"
                               % (where, stem[:40], ans))
                asked.add(ans)
                opts = names
            elif it.get("set") == "country":
                ans = it["a"]
                if ans not in spec["countries"]:
                    bad.append("%s: %r answers %r, which is not a country on the list"
                               % (where, stem[:40], ans))
                asked.add(it.get("who"))
                opts = spec["countries"]
            else:
                opts = it.get("opts") or []
                if not (0 <= it.get("a", -1) < len(opts)):
                    bad.append("%s: %r has no answer at index %r"
                               % (where, stem[:40], it.get("a")))
                    continue
                ans = opts[it["a"]]
                asked.add(it.get("who"))
                spread.add(it["a"])
                if len(set(opts)) != len(opts):
                    bad.append("%s: %r repeats an option" % (where, stem[:40]))
                others = [o for i, o in enumerate(opts) if i != it["a"]]
                if others and len(ans) > max(len(o) for o in others):
                    bad.append("%s: on %r the correct option is the longest one"
                               % (where, stem[:40]))

            # A question that prints its own answer is a free mark. The
            # country rounds name the man and ask for his country, so the
            # check is on the answer, not on the explorer's name.
            if len(bare(ans)) >= 5 and bare(ans) in bare(stem):
                bad.append("%s: %r contains its own answer %r"
                           % (where, stem[:40], ans))

        missing = [n for n in names if n not in asked]
        if missing:
            bad.append("%s never asks about %s" % (where, ", ".join(missing)))
        # Written answers that all sit at index 1 are a pattern even after the
        # options are shuffled at render, because a shuffle of a fixed list is
        # only as good as the list it starts from.
        if q["mode"] == "pick" and spread and len(spread) < 2:
            bad.append("%s: every written answer sits at index %s"
                       % (where, spread.pop()))

    if bad:
        raise SystemExit("  refusing to build:\n    " + "\n    ".join(bad))


def main():
    spec_name = MINE[0] if MINE else "explorers_ae.json"
    out_dir = MINE[1] if len(MINE) > 1 else "ae-explorers"
    spec = json.load(io.open(os.path.join(HERE, spec_name), encoding="utf-8"))
    check(spec)

    shell = io.open(os.path.join(HERE, "explorers_shell.html"), encoding="utf-8").read()
    out = shell.replace("DATA_GOES_HERE", json.dumps(spec, ensure_ascii=False, indent=1))
    out = out.replace("TITLE_GOES_HERE", "%s \u2014 The Age of Exploration" % spec["title"])
    out = out.replace("EYEBROW_GOES_HERE", "History \u00b7 Age of Exploration")
    out = out.replace("H1_GOES_HERE", spec["title"])
    for leftover in ("DATA_GOES_HERE", "TITLE_GOES_HERE", "EYEBROW_GOES_HERE", "H1_GOES_HERE"):
        if leftover in out:
            raise SystemExit("  %s was never filled in" % leftover)

    d = os.path.join(ROOT, "history", out_dir)
    os.makedirs(d, exist_ok=True)
    io.open(os.path.join(d, "index.html"), "w", encoding="utf-8",
            newline="\r\n").write(out)

    print("  history/%s  %.1f KB" % (out_dir, len(out) / 1024))
    for c in spec["countries"]:
        who = [e["name"] for e in spec["explorers"] if e["country"] == c]
        print("    %-16s %s" % (c, ", ".join(who)))
    print()
    for q in spec["quizzes"]:
        pages = sorted({it["page"] for it in q["items"]})
        print("    %-8s %-16s %2d questions, pages %d\u2013%d"
              % (q["name"], q["title"], len(q["items"]), pages[0], pages[-1]))
    total = sum(len(q["items"]) for q in spec["quizzes"])
    print("    %d questions in all, about %d minutes" % (total, round(total * 0.4)))


main()
