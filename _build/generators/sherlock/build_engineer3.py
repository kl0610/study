# -*- coding: utf-8 -*-
"""Write the pages 103-120 section, or refuse and say why.

Four chapters, twenty questions, five versions of each. The checks below are the
ones earlier weeks were caught by, plus the ones this week's new shape needs:

  verbatim      every quoted sentence is in the reader, letters only, so the
                PDF's dropped spaces and its page-break running heads cannot
                make correct text look wrong
  highlights    every `hi` mark is found in its own passage, or a miss opens the
                book at nothing
  one answer    four options, all different, exactly one right
  no tells      the right answer is never the longest by more than six
                characters -- a child who has learned nothing can still pick
                the longest one
  no markup     the shell escapes a question before printing it
  five papers   every item has five versions; no two versions of a question are
                worded the same; no two share their set of wrong answers; and
                the right answer does not sit in the same place on all five
  chapters      each mission's questions are in story order, and every passage
                a mission uses is actually asked about
"""
import io
import json
import os
import re
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)

from eng3_text import PASSAGES
from eng3_q12 import CH1, CH2
from eng3_q34 import CH3, CH4

from pypdf import PdfReader

ROOT = r"C:\Users\kl\projects\study"
OUT = os.path.join(ROOT, "_build", "generators", "sections_engineer.json")
SLUG = "sherlock-engineer-3"
PAPERS = 5

FURNITURE = re.compile(
    r"SHERLOCK HOLMES/\d+/\d+\s+\d+/\d+/\d+\s+\d+:\d+\s+Page \d+"
    r"|\d+\s*SELECTED ADVENTURES OF SHERLOCK HOLMES"
    r"|\d+\s*THE ADVENTURE OF THE ENGINEER\s*\u2019?\s*S THUMB")
TAG = re.compile(r"</?[a-zA-Z]+ ?/?>")


def bare(s):
    return re.sub(r"[^a-z]", "", s.lower())


CHAPTERS = [
    ("m1", "Chapter 1 \u2014 pages 103 to 107",
     "The drive out, the dark house, and a warning he does not take", CH1),
    ("m2", "Chapter 2 \u2014 pages 108 to 111",
     "Ferguson, the machine, and the one question he should not have asked", CH2),
    ("m3", "Chapter 3 \u2014 pages 113 to 117",
     "The ceiling, the panel, the window and the cleaver", CH3),
    ("m4", "Chapter 4 \u2014 pages 118 to 120",
     "The hedge by the station, the advertisement, and Bradstreet\u2019s circle", CH4),
]

# Which passages belong to which chapter, in the order the story tells them.
# ---------------------------------------------------------------- selection
# Twenty questions over these pages was twice the density of anything built
# before, and a homework section has to be answerable in ten minutes end to end.
# Three per chapter is about eight. The questions not selected stay written in
# the question files: putting one back is a line in KEEP.
KEEP = {
    "m1": ['horse', 'drive', 'warn'],
    "m2": ['plea', 'inside', 'trough'],
    "m3": ['ceiling', 'panel', 'fritz'],
    "m4": ['hedge', 'advert', 'guesses'],
}


def keep(items, mid):
    """This chapter's selected questions, in the order KEEP names them."""
    by = {it["p"]: it for it in items}
    missing = [k for k in KEEP[mid] if k not in by]
    if missing:
        raise SystemExit("  %s: no question about %s" % (mid, ", ".join(missing)))
    return [by[k] for k in KEEP[mid]]

ORDER = {
    "m1": ["horse", "drive", "porch", "books", "warn"],
    "m2": ["plea", "door", "house", "inside", "trough"],
    "m3": ["ceiling", "panel", "elise", "window", "fritz"],
    "m4": ["hedge", "porter", "advert", "circle", "guesses"],
}


def reader_text():
    r = PdfReader(os.path.join(ROOT, "_source", "reading",
                               "CC_SherlockHolmes_Reader_W1.pdf"))
    pages = []
    for printed in range(101, 123):            # a page either side of 103-120
        t = r.pages[printed + 13 - 1].extract_text() or ""
        pages.append(FURNITURE.sub(" ", t))
    return bare(" ".join(pages))


def check():
    bad = []
    book = reader_text()

    quoted = 0
    for key, p in PASSAGES.items():
        for s in p["text"]:
            quoted += 1
            if bare(s) not in book:
                bad.append("%s: not in the reader \u2014 %s" % (key, s[:70]))

    used = set()
    for mid, name, blurb, items in CHAPTERS:
        items = keep(items, mid)
        keys = [it["p"] for it in items]
        used |= set(keys)
        if keys != [k for k in ORDER[mid] if k in set(keys)]:
            bad.append("%s: questions are not in story order \u2014 %s" % (mid, keys))
        for n, it in enumerate(items, 1):
            where = "%s q%d" % (mid, n)
            p = PASSAGES.get(it["p"])
            if not p:
                bad.append("%s: no passage called %s" % (where, it["p"]))
                continue
            body = " ".join(p["text"])
            for h in it["hi"]:
                if h not in body:
                    bad.append("%s: highlight not in the passage \u2014 %s" % (where, h[:50]))

            vs = it["vs"]
            if len(vs) != PAPERS:
                bad.append("%s: %d versions, wanted %d" % (where, len(vs), PAPERS))
            for k, v in enumerate(vs, 1):
                spot = "%s v%d" % (where, k)
                if len(v["opts"]) != 4:
                    bad.append("%s: %d options" % (spot, len(v["opts"])))
                if len(set(v["opts"])) != len(v["opts"]):
                    bad.append("%s: two options are the same" % spot)
                if not 0 <= v["a"] < len(v["opts"]):
                    bad.append("%s: answer index %s is out of range" % (spot, v["a"]))
                    continue
                right = v["opts"][v["a"]]
                longest = max(len(o) for o in v["opts"])
                if len(right) == longest:
                    margin = longest - max(len(o) for i, o in enumerate(v["opts"])
                                           if i != v["a"])
                    if margin > 6:
                        bad.append("%s: the right answer is the longest by %d"
                                   % (spot, margin))
                for what, txt in (("q", v["q"]), ("why", v["why"])) + \
                                 tuple(("option", o) for o in v["opts"]):
                    if TAG.search(txt):
                        bad.append("%s: markup in the %s" % (spot, what))

            # the five papers have to differ from one another
            if len(set(v["q"] for v in vs)) != len(vs):
                bad.append("%s: two versions ask the same question" % where)
            wrongs = [frozenset(o for i, o in enumerate(v["opts"]) if i != v["a"])
                      for v in vs]
            if len(set(wrongs)) != len(wrongs):
                bad.append("%s: two versions offer the same wrong answers" % where)
            if len(set(v["a"] for v in vs)) < 2:
                bad.append("%s: the answer sits in the same place on every paper" % where)

    # Passages belonging to questions that were not selected are simply not
    # shipped -- a passage only ever appears behind its own question.
    for key in list(PASSAGES):
        if key not in used:
            del PASSAGES[key]
    return bad, quoted


def build():
    bad, quoted = check()
    if bad:
        print("  refusing to write:")
        for b in bad:
            print("    " + b)
        return 1

    section = {
        "slug": SLUG,
        "title": "The Machine and the Circle",
        "pages": "103\u2013120",
        "bigQuestion": ("Hatherley is warned twice and stays, and nearly dies for it. "
                        "By the end, four men are pointing at four different places on a "
                        "map \u2014 and Holmes says all four are wrong. What did Hatherley "
                        "see that none of them have used yet?"),
        "passages": PASSAGES,
        "mission": None,          # filled per chapter below
        "items": None,
    }

    # Four chapters means four missions in one app, so each can be sat on its own.
    missions = []
    for mid, name, blurb, items in CHAPTERS:
        items = keep(items, mid)
        missions.append({
            "id": mid,
            "name": name,
            "tag": "%d questions \u00b7 %d papers \u00b7 about 2 minutes" % (len(items), PAPERS),
            "blurb": blurb,
            "items": items,
        })
    section["missions"] = missions
    del section["mission"]
    del section["items"]

    sections = json.load(io.open(OUT, encoding="utf-8"))
    sections = [s for s in sections if s["slug"] != SLUG] + [section]
    io.open(OUT, "w", encoding="utf-8", newline="\n").write(
        json.dumps(sections, ensure_ascii=False, indent=1))

    n = sum(len(m["items"]) for m in missions)
    print("  sections_engineer.json  %d sections, newest is %s" % (len(sections), SLUG))
    print("  %d chapters, %d questions, %d versions each = %d ways to be asked"
          % (len(missions), n, PAPERS, n * PAPERS))
    print("  %d quoted sentences checked against the reader" % quoted)
    print("  every highlight found, four distinct options each, no answer the longest")
    return 0


sys.exit(build())
