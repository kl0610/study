"""Build a reading quiz for a stretch of Don Quixote.

    python gen_dq.py dq_quiz_p1_12.json dq-p1-12

WHY THIS ONE IS DIFFERENT. Every other reader on this site has a text layer,
so a question can be checked straight against the book's own words. The Core
Classics Don Quixote is a scan: 262 of its 265 pages carry no text at all,
only JBIG2 images. Nothing on this machine can read it automatically.

So the pages were rendered and read by eye, and what was read is written down
in dq_pages_1_12.json. That file is the source of record, and every question
is checked against it: an answer or a hint that talks about something not on
its page stops the build. This does not prove the reading was right -- nothing
here can -- but it does stop a question drifting away from the page it cites,
which is the fault that got shipped in the explorers quiz and had to be found
by a ten-year-old's father.

The honest limit is worth stating plainly: for this book, "verified" means
"matches what was transcribed", not "matches the book".
"""
import io, json, os, re, sys

ROOT = r"C:\Users\kl\projects\study"
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(ROOT, "_build"))
MINE = sys.argv[1:]
sys.argv = ["x"]
import build_theme as B                                           # noqa: E402

STOP = set("""the a an and or of to in on at for from with by is was were be been
it he she his her they them that this these those as but not no so had has have
will would could do did you your i we us our him me my if when then than there
their into out up down over all any one two more most some such only own same
very can just what which who whom how why where did does done about after before
again still even ever never now once upon his him said says say told tell asked
ask made make making made got get gets getting go goes going went gone come came
first last next other another each every both either neither""".split())


def words(s):
    return set(w for w in re.findall(r"[a-z]{4,}", str(s).lower()) if w not in STOP)


def check(spec, src):
    bad = []
    for f in ("title", "sub", "cite", "note", "groups", "items"):
        if not spec.get(f):
            bad.append("no %s" % f)
    if bad:
        raise SystemExit("  refusing to build:\n    " + "\n    ".join(bad))

    known = src["pages"]
    spread, pages_used = set(), set()

    # A question is either about the book or about Ms. Santos's guide -- the
    # RACES toolkit and the Week 1 word list. Both cite a page, and they are
    # different books, so an item that does not say which would send him to
    # page 2 of Cervantes looking for the word "paraphrase".
    GUIDE_PAGES = {2: "the RACES toolkit", 3: "the Week 1 page"}

    for it in spec["items"]:
        stem = it["q"]
        pg = str(it.get("page"))

        if it.get("src") == "guide":
            if it.get("page") not in GUIDE_PAGES:
                bad.append("%r cites guide page %r, and the guide has %s"
                           % (stem[:40], it.get("page"),
                              " and ".join(str(k) for k in sorted(GUIDE_PAGES))))
        elif pg not in known:
            bad.append("%r cites page %s, which is not in the transcription"
                       % (stem[:40], pg))
            continue
        else:
            pages_used.add(int(pg))

        if not (0 <= it.get("a", -1) < len(it["opts"])):
            bad.append("%r has no answer at index %r" % (stem[:40], it.get("a")))
            continue
        ans = it["opts"][it["a"]]
        spread.add(it["a"])

        if len(set(it["opts"])) != len(it["opts"]):
            bad.append("%r repeats an option" % stem[:40])
        others = [o for i, o in enumerate(it["opts"]) if i != it["a"]]
        if others and len(ans) > max(len(o) for o in others):
            bad.append("on %r the correct option is the longest one" % stem[:40])
        if not it.get("hint"):
            bad.append("%r has no hint" % stem[:40])
        if not it.get("why"):
            bad.append("%r never says why" % stem[:40])
        if not (0 <= it.get("group", -1) < len(spec["groups"])):
            bad.append("%r sits in group %r, which does not exist"
                       % (stem[:40], it.get("group")))

        # The answer and the explanation have to be about what is on that page.
        # Only for the book: the guide is not transcribed here, and checking a
        # RACES question against Cervantes would fail every time.
        if it.get("src") == "guide":
            continue
        page = known[pg]
        onpage = words(" ".join(page["facts"]) + " " +
                       " ".join("%s %s" % (k, v) for k, v in
                                (page.get("glossary") or {}).items()))
        for field, text in (("answer", ans), ("why", it.get("why", "")),
                            ("hint", it.get("hint", ""))):
            shared = words(text) & onpage
            if not shared:
                bad.append("the %s for %r shares nothing with what was read on "
                           "page %s" % (field, stem[:40], pg))

    # Ten minutes was asked for explicitly, so the build enforces it rather
    # than trusting whoever adds the next question to keep count. The optional
    # round does not count: he is not asked to do it.
    core = [it for it in spec["items"]
            if not spec["groups"][it["group"]].get("optional")]
    mins = len(core) * 0.45
    if mins > 10:
        bad.append("the run he is asked to do is %d questions, about %.0f minutes, "
                   "and ten was the limit" % (len(core), mins))

    if len(spread) < 3:
        bad.append("the answers only ever sit at %s, which is a pattern he will "
                   "find before he finds the story" % sorted(spread))

    # A quiz that skips pages he was told to read leaves him guessing which
    # parts mattered.
    missing = sorted(set(int(p) for p in known) - pages_used)
    if missing:
        bad.append("no question touches page(s) %s"
                   % ", ".join(str(m) for m in missing))

    if bad:
        raise SystemExit("  refusing to build:\n    " + "\n    ".join(bad))


def main():
    spec_name = MINE[0] if MINE else "dq_quiz_p1_12.json"
    out_dir = MINE[1] if len(MINE) > 1 else "dq-p1-12"
    spec = json.load(io.open(os.path.join(HERE, spec_name), encoding="utf-8"))
    src = json.load(io.open(os.path.join(HERE, spec["from"]), encoding="utf-8"))
    check(spec, src)

    spec["source"] = src
    shell = io.open(os.path.join(HERE, "dq_shell.html"), encoding="utf-8").read()
    out = shell.replace("DATA_GOES_HERE", json.dumps(spec, ensure_ascii=False, indent=1))
    out = out.replace("TITLE_GOES_HERE", "%s \u2014 Don Quixote" % spec["title"])
    out = out.replace("H1_GOES_HERE", spec["title"])
    for leftover in ("DATA_GOES_HERE", "TITLE_GOES_HERE", "H1_GOES_HERE"):
        if leftover in out:
            raise SystemExit("  %s was never filled in" % leftover)

    d = os.path.join(ROOT, "reading", out_dir)
    os.makedirs(d, exist_ok=True)
    io.open(os.path.join(d, "index.html"), "w", encoding="utf-8",
            newline="\r\n").write(out)

    print("  reading/%s  %.1f KB" % (out_dir, len(out) / 1024))
    for gi, g in enumerate(spec["groups"]):
        n = [it for it in spec["items"] if it["group"] == gi]
        # Say which book those page numbers belong to. "pages 2-2" meaning the
        # RACES toolkit and "pages 2-2" meaning Cervantes look identical, and
        # that ambiguity is what this whole file exists to stop.
        g_ = sum(1 for i in n if i.get("src") == "guide")
        where = "guide" if g_ == len(n) else "book" if g_ == 0 else "mixed"
        print("    %-9s %-25s %2d questions, %s pages %d\u2013%d"
              % (g["name"], g["sub"], len(n), where,
                 min(i["page"] for i in n), max(i["page"] for i in n)))
    core = [it for it in spec["items"]
            if not spec["groups"][it["group"]].get("optional")]
    print("    %d questions in the run he is asked to do, about %d minutes"
          % (len(core), round(len(core) * 0.45)))
    print("    %d more in the optional round" % (len(spec["items"]) - len(core)))
    print("    every page from %s to %s is asked about"
          % (min(src["pages"], key=int), max(src["pages"], key=int)))


main()
