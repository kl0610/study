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
    for f in ("title", "sub", "cite", "note", "items"):
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
    # than trusting whoever adds the next question to keep count.
    mins = len(spec["items"]) * 0.45
    if mins > 10:
        bad.append("%d questions is about %.0f minutes, and ten was the limit"
                   % (len(spec["items"]), mins))

    # The blurb and the subtitle are the only two places that say the size of
    # the quiz in words, and they are the two places that go stale when a
    # question is added. The subtitle of pages 63-70 said "Thirteen questions"
    # over fourteen of them, while the hub tile and the card badge both said
    # 14 -- a thing no test could see and only looking at the page caught.
    WORDS = {"one": 1, "two": 2, "three": 3, "four": 4, "five": 5, "six": 6,
             "seven": 7, "eight": 8, "nine": 9, "ten": 10, "eleven": 11,
             "twelve": 12, "thirteen": 13, "fourteen": 14, "fifteen": 15,
             "sixteen": 16, "seventeen": 17, "eighteen": 18, "nineteen": 19,
             "twenty": 20}

    def spoken(n):
        return re.compile(r"\b(%s|\d+)\s+%s\b"
                          % ("|".join(WORDS), n), re.I)

    for field in ("sub", "blurb"):
        text = spec.get(field) or ""
        for noun, want in (("questions", len(spec["items"])),
                           ("minutes", int(round(mins)))):
            for said in spoken(noun).findall(text):
                got = WORDS.get(said.lower(), None)
                got = int(said) if got is None and said.isdigit() else got
                if got is not None and got != want:
                    bad.append("the %s says %s %s, and there are %d"
                               % (field, said, noun, want))

    # The evidence rows are what he draws on for a piece of writing, and only
    # a quiz that sets a big question needs them. A later segment read purely
    # for what happened in the story has nothing to collect evidence for, and
    # asking for three unconditionally would refuse to build every one of them.
    if spec.get("bigq"):
        ev = [it for it in spec["items"] if it.get("evidence")]
        if len(ev) < 3:
            bad.append("only %d questions are marked as evidence, and the big "
                       "question needs three examples" % len(ev))

    # Refusing only the longest answer catches half of the tell. A right
    # answer that is the shortest thing on the card reads as the plain one
    # among four elaborate guesses, and the pages 63-70 draft had six of them
    # out of thirteen before anyone looked. One is chance; a third of the
    # quiz is a rule he can learn instead of the book.
    shortest = [it for it in spec["items"]
                if 0 <= it.get("a", -1) < len(it["opts"])
                and len(it["opts"][it["a"]]) < min(
                    [len(o) for i, o in enumerate(it["opts"]) if i != it["a"]]
                    or [0])]
    if len(shortest) * 3 > len(spec["items"]):
        bad.append("the right answer is the shortest option on %d of %d "
                   "questions, which is a habit he will find before he finds "
                   "the story: %s" % (len(shortest), len(spec["items"]),
                                      "; ".join(i["q"][:34] for i in shortest[:4])))

    if len(spread) < 3:
        bad.append("the answers only ever sit at %s, which is a pattern he will "
                   "find before he finds the story" % sorted(spread))

    # A quiz that skips pages he was told to read leaves him guessing which
    # parts mattered. The one exception is a page that is nothing but a
    # full-page plate: there is no story on it to ask about, and pages 63-70
    # has one at 65. It is still transcribed, so the record of what was read
    # has no silent hole in it, and it carries "art": true rather than being
    # quietly left out of the file.
    # The second exemption is a page with no story on it that is not a
    # picture either: pages 116-124 contains the half-title that divides the
    # book, printed with the title and PART 2 and nothing else. Calling that
    # "art" would put a falsehood in the record of what was read, so it
    # carries "divider" and is transcribed like every other page.
    art = set(int(p) for p, v in known.items() if v.get("art"))
    blank = set(int(p) for p, v in known.items() if v.get("divider"))
    missing = sorted(set(int(p) for p in known) - pages_used - art - blank)
    if missing:
        bad.append("no question touches page(s) %s"
                   % ", ".join(str(m) for m in missing))

    # The exemption only runs one way. A question that cites the plate is a
    # question about a caption, which is looking at a picture rather than
    # reading the story, and the caption only repeats a line from the page
    # before it anyway.
    for p in sorted(art & pages_used):
        bad.append("page %d is a full-page illustration, and a question cites "
                   "it as though there were a story on it" % p)

    for p in sorted(blank & pages_used):
        bad.append("page %d is a half-title with no story on it, and a question "
                   "cites it as though there were" % p)

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
    print("    %d questions, about %d minutes"
          % (len(spec["items"]), round(len(spec["items"]) * 0.45)))
    ev = [it for it in spec["items"] if it.get("evidence")]
    if ev:
        print("    %d of them collect on the sheet for the writing: pages %s"
              % (len(ev), ", ".join(str(i["page"]) for i in ev)))
    print("    every page from %s to %s is asked about"
          % (min(src["pages"], key=int), max(src["pages"], key=int)))


main()
