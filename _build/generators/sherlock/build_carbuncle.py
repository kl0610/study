# -*- coding: utf-8 -*-
"""Write the Blue Carbuncle section, or refuse and say why.

Same checks as the last section, plus one this story needs: the reading stops on
page 136 and the blue stone is on 137, so nothing may name it. A distractor that
reaches past the reading tells him the answer to something he has not read, and
one did last time.

  verbatim      every quoted sentence is in the reader, letters only, so dropped
                spaces and page-break furniture cannot make correct text look
                wrong. An illustration caption is checked against the unstripped
                page, since a caption is itself furniture.
  highlights    every `hi` mark is in its own passage, at most four per question
  one answer    four options, all different, exactly one right
  no tells      the right answer is never the longest by more than six
  no markup     the shell escapes a question before printing it
  five papers   five versions each; no two worded alike; no two sharing a set of
                wrong answers; the answer not always in the same slot; and no
                version offering as wrong what another version marks right
  no spoilers   nothing from page 137 onwards, in any version of any question
  chapters      questions in story order, and every passage is asked about
"""
import io
import json
import os
import re
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)

from carb_text import PASSAGES
from carb_q12 import CH1, CH2
from carb_q34 import CH3, CH4

from pypdf import PdfReader

ROOT = r"C:\Users\kl\projects\study"
OUT = os.path.join(ROOT, "_build", "generators", "sections_carbuncle.json")
SLUG = "sherlock-carbuncle-1"
PAPERS = 5
FIRST, LAST = 126, 136

FURNITURE = re.compile(
    r"SHERLOCK HOLMES/\d+/\d+\s+\d+/\d+/\d+\s+\d+:\d+\s+Page \d+"
    r"|\d+\s*SELECTED ADVENTURES OF SHERLOCK HOLMES"
    r"|\d+\s*THE ADVENTURE OF THE BLUE CARBUNCLE"
    r"|\d+\s*THE ADVENTURE OF THE ENGINEER\s*\u2019?\s*S THUMB"
    r"|BILLYCOCK\s*A man\u2019s\s*felt hat\."
    r"|The Adventure\s*of\s*the Blue Carbuncle")
CAPTION = re.compile(r"(?m)^[A-Z][A-Z \u2019',\-\.!]{12,}$")
TAG = re.compile(r"</?[a-zA-Z]+ ?/?>")

# What is on page 137 and may not be reached for. The reading ends with Peterson
# in the doorway; the stone, the Countess and the reward are all past it.
SPOILERS = ["carbuncle", "countess", "morcar", "diamond", "precious stone",
            "thousand pounds", "blue stone", "jewel", "gem"]
# Whole words only. The first run of this flagged "judgement" for containing
# "gem", which is the sort of false alarm that gets a check switched off.
B = chr(92) + "b"       # a heredoc ate this escape once already
SPOIL_RE = [re.compile(B + w.replace(" ", r"\s+") + "s?" + B, re.I)
            for w in SPOILERS]


def bare(s):
    return re.sub(r"[^a-z]", "", s.lower())


CHAPTERS = [
    ("m1", "Chapter 1 \u2014 pages 126 to 130",
     "A hat and a goose arrive at Baker Street, and Holmes says there is no crime in it", CH1),
    ("m2", "Chapter 2 \u2014 pages 131 to 132",
     "Watson looks at the hat, sees everything, and reads nothing", CH2),
    ("m3", "Chapter 3 \u2014 pages 133 to 134",
     "Holmes shows his work: the brim, the securer, the lining and the dust", CH3),
    ("m4", "Chapter 4 \u2014 pages 135 to 136",
     "The wife, the candle, \u201ca waste of energy\u201d \u2014 and the door flies open", CH4),
]

# ---------------------------------------------------------------- selection
# Twenty questions over these pages was twice the density of anything built
# before, and a homework section has to be answerable in ten minutes end to end.
# Three per chapter is about eight. The questions not selected stay written in
# the question files: putting one back is a line in KEEP.
KEEP = {
    "m1": ['nocrime', 'fled', 'baker'],
    "m2": ['reason', 'list1', 'list2'],
    "m3": ['capacity', 'threeyears', 'securer'],
    "m4": ['brushed', 'waste', 'burst'],
}


def keep(items, mid):
    """This chapter's selected questions, in the order KEEP names them."""
    by = {it["p"]: it for it in items}
    missing = [k for k in KEEP[mid] if k not in by]
    if missing:
        raise SystemExit("  %s: no question about %s" % (mid, ", ".join(missing)))
    return [by[k] for k in KEEP[mid]]

ORDER = {
    "m1": ["calling", "nocrime", "street", "fled", "baker"],
    "m2": ["lens", "describe", "reason", "list1", "list2"],
    "m3": ["capacity", "threeyears", "securer", "lining", "dust"],
    "m4": ["brushed", "bachelor", "wax", "waste", "burst"],
}


def reader():
    r = PdfReader(os.path.join(ROOT, "_source", "reading",
                               "CC_SherlockHolmes_Reader_W1.pdf"))
    pages = [r.pages[p + 13 - 1].extract_text() or ""
             for p in range(FIRST - 1, LAST + 2)]
    stripped = bare(" ".join(CAPTION.sub(" ", FURNITURE.sub(" ", t)) for t in pages))
    return stripped, bare(" ".join(pages))


def check():
    bad = []
    stripped, raw = reader()

    quoted = 0
    for key, p in PASSAGES.items():
        for s in p["text"]:
            quoted += 1
            if bare(s) not in stripped and bare(s) not in raw:
                bad.append("%s: not in the reader \u2014 %s" % (key, s[:70]))

    used = set()
    versions = 0
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
            if len(it["hi"]) > 4:
                bad.append("%s: %d highlights \u2014 a mark is a pointer, not a paragraph"
                           % (where, len(it["hi"])))
            for h in it["hi"]:
                if h not in body:
                    bad.append("%s: highlight not in the passage \u2014 %s" % (where, h[:50]))

            vs = it["vs"]
            if len(vs) != PAPERS:
                bad.append("%s: %d versions, wanted %d" % (where, len(vs), PAPERS))
            for k, v in enumerate(vs, 1):
                versions += 1
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
                fields = [("q", v["q"]), ("why", v["why"])] + \
                         [("option", o) for o in v["opts"]]
                for what, txt in fields:
                    if TAG.search(txt):
                        bad.append("%s: markup in the %s" % (spot, what))
                    for w, rx in zip(SPOILERS, SPOIL_RE):
                        if rx.search(txt):
                            bad.append("%s: reaches past the reading (%s) in the %s"
                                       % (spot, w, what))

            if len(set(v["q"] for v in vs)) != len(vs):
                bad.append("%s: two versions ask the same question" % where)
            wrongs = [frozenset(o for i, o in enumerate(v["opts"]) if i != v["a"])
                      for v in vs]
            if len(set(wrongs)) != len(wrongs):
                bad.append("%s: two versions offer the same wrong answers" % where)
            if len(set(v["a"] for v in vs)) < 2:
                bad.append("%s: the answer sits in the same place on every paper" % where)
            rights = set(v["opts"][v["a"]] for v in vs if 0 <= v["a"] < len(v["opts"]))
            for k, v in enumerate(vs, 1):
                for i, o in enumerate(v["opts"]):
                    if i != v["a"] and o in rights:
                        bad.append("%s v%d: offers as wrong what another paper marks right"
                                   % (where, k))

    # Passages belonging to questions that were not selected are simply not
    # shipped -- a passage only ever appears behind its own question.
    for key in list(PASSAGES):
        if key not in used:
            del PASSAGES[key]

    # The passages themselves must not name what is on 137 either.
    for key, p in PASSAGES.items():
        body = " ".join(p["text"]) + " " + p["title"]
        for w, rx in zip(SPOILERS, SPOIL_RE):
            if rx.search(body):
                bad.append("passage %s reaches past the reading (%s)" % (key, w))
    return bad, quoted, versions


def build():
    bad, quoted, versions = check()
    if bad:
        print("  refusing to write:")
        for b in bad:
            print("    " + b)
        return 1

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

    section = {
        "slug": SLUG,
        "title": "The Hat on the Chair",
        "pages": "126\u2013136",
        "bigQuestion": ("Holmes says there is no crime in it, and then reads a whole "
                        "man off a hat he has never seen worn. Watson calls it a waste "
                        "of energy. Who is right \u2014 and what has the hat actually "
                        "proved, as against what it has only suggested?"),
        "passages": PASSAGES,
        "missions": missions,
    }

    sections = []
    if os.path.exists(OUT):
        sections = json.load(io.open(OUT, encoding="utf-8"))
    sections = [s for s in sections if s["slug"] != SLUG] + [section]
    io.open(OUT, "w", encoding="utf-8", newline="\n").write(
        json.dumps(sections, ensure_ascii=False, indent=1))

    n = sum(len(m["items"]) for m in missions)
    print("  sections_carbuncle.json  %d section(s), newest is %s" % (len(sections), SLUG))
    print("  %d chapters, %d questions, %d versions each = %d ways to be asked"
          % (len(missions), n, PAPERS, versions))
    print("  %d quoted sentences checked against the reader" % quoted)
    print("  highlights found, four distinct options each, no answer the longest")
    print("  nothing in any version names what is on page %d" % (LAST + 1))
    return 0


sys.exit(build())
