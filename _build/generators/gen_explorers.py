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

GLOSS = []            # the reader's Vocabulary terms, filled in at build time
PAGES = (1, 99)          # the Student Reader's printed page range
OFFSET = 6               # printed page = PDF page - 6, checked against the folios
READER = os.path.join(ROOT, "_source", "history",
                      "CKHG_G5_U3_AgeExploration_SR.pdf")

# Ordinary English that happens to be capitalised in a sentence, or that the
# book simply does not use. Anything else capitalised mid-sentence, and every
# year, is a fact the hint is standing on and has to be on the page it cites.
NOT_A_FACT = set("""He His She Her They Them The A An In On At For From With By It
Its This That When Then There Before After And But Of To Both Five Three Two One
Have Had Has Nobody Years Early Stormy Student Reader Give Native Americans
Think Read Sailing Portuguese Spanish English French Dutch Venetian""".split())


def reader_pages():
    """The printed pages of the Student Reader, by folio number.

    Without the book there is nothing to check a hint against, so a missing
    reader is a refusal and not a shrug: shipping unverified hints is the
    fault this whole check exists to stop.
    """
    if not os.path.exists(READER):
        raise SystemExit("  the Student Reader is not at %s, so no hint can be "
                         "checked against the book" % READER)
    from pypdf import PdfReader
    r = PdfReader(READER)
    out = {}
    for i, p in enumerate(r.pages):
        try:
            t = p.extract_text() or ""
        except Exception:
            t = ""
        out[i + 1 - OFFSET] = re.sub(r"\s+", " ", t)
    return out


def cited(spread):
    """The printed pages an item points at: "21-22" means both."""
    if isinstance(spread, str):
        a, b = re.split(r"[^0-9]+", spread.strip())[:2]
        return list(range(int(a), int(b) + 1))
    return [int(spread)]


def glossary(book):
    """The reader's own Vocabulary terms, pulled out of its margins.

    A hint may paraphrase freely -- he is not being quizzed on wording -- but
    if it reaches for one of the book's own terms, that term has to be on the
    page it sends him to. This is what catches an invented fact rather than a
    misplaced one: a hint once told him a strait was named after Hudson, and
    the book names no such strait. "Strait" is a glossary word, it was not on
    the page cited, and nothing noticed. The proper-noun check could not see
    it because the word is lowercase.
    """
    blob = " ".join(book.values())
    return sorted(set(m.group(1).lower() for m in
                      re.finditer(r"Vocabulary ([a-zA-Z][a-zA-Z \-]{2,24}?), "
                                  r"(?:n|v|adj|adv)\.", blob)))


def off_page(text, pages_text):
    """Which facts in this sentence are not on those pages.

    Paraphrase is free -- he is not being quizzed on the book's wording. A
    name, a place or a year is different: if the hint says Mombasa and the
    page it sends him to has no Mombasa on it, the hint is pointing at the
    wrong page, which is exactly the fault this was written for.
    """
    anchors = set(re.findall(r"\b1[0-9]{3}\b", text))
    for m in re.finditer(r"(?<![.!?“]\s)(?<!^)\b([A-Z][a-zA-Zé’]+)\b", text):
        if m.group(1) not in NOT_A_FACT:
            anchors.add(m.group(1))
    blob = " ".join(pages_text)
    return sorted(a for a in anchors
                  if not re.search(r"\b" + re.escape(a) + r"\b", blob, re.I))


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

    book = reader_pages()
    global GLOSS
    GLOSS = glossary(book)

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
            else:
                # The hint has to be readable on the page it sends him to.
                # This shipped once with eight hints pointing a page or two
                # away from their own facts, and one naming a strait the book
                # never mentions.
                want = cited(it.get("span") or it["page"])
                if it["page"] not in want:
                    bad.append("%s: %r spans %s, which does not include page %d"
                               % (where, stem[:40], it.get("span"), it["page"]))
                text = [book.get(p, "") for p in want]
                blob = " ".join(text).lower()
                for field in ("hint", "why"):
                    said = it.get(field, "")
                    gone = off_page(said, text)
                    if gone:
                        bad.append("%s: the %s for %r names %s, which is not on "
                                   "page %s" % (where, field, stem[:40],
                                                ", ".join(gone),
                                                it.get("span") or it["page"]))
                    for term in GLOSS:
                        if re.search(r"\b" + re.escape(term) + r"\b", said, re.I) \
                                and term not in blob:
                            bad.append("%s: the %s for %r uses the book's term %r, "
                                       "which is not on page %s"
                                       % (where, field, stem[:40], term,
                                          it.get("span") or it["page"]))
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
