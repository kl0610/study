# -*- coding: utf-8 -*-
"""Write the pages 198-209 section, or refuse and say why.

Four sections of three questions -- sections, not chapters -- twelve in all,
five versions of each, about eight minutes end to end. Twelve pages, and the
brief was the same as the last few weeks: help the reader follow the story and
the people in it.

The checks are the ones the last few weeks were caught by:

  verbatim      every quoted sentence is in the reader, letters only, checked
                against the pages both with the furniture stripped and with it
                intact, so a sentence running across a page break and an
                illustration caption can both be verified
  highlights    every `hi` mark is in its own passage, at most four per question
  one answer    four options, all different, exactly one right
  no tells      the right answer is never the longest by more than six
  no markup     the shell escapes a question before printing it
  five papers   five versions each; no two worded alike; no two sharing a set of
                wrong answers; the answer not always in the same slot; and no
                version offering as wrong what another version marks right
  budget        twelve questions, four sections, about two minutes each

There is no spoiler list this time, and that is deliberate rather than an
oversight. Every other section of this book stopped partway through a story, so
there was always a next page to keep quiet about. This one ends it: page 209 is
the last line of The Copper Beeches and page 210 begins the life of Conan
Doyle. So the reader is loaded only as far as 209, and nothing downstream has a
page to protect.
"""
import io
import json
import os
import re
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)

from beech3_text import PASSAGES
from beech3_q12 import S1, S2
from beech3_q34 import S3, S4

from pypdf import PdfReader

ROOT = r"C:\Users\kl\projects\study"
OUT = os.path.join(ROOT, "_build", "generators", "sections_beeches.json")
SLUG = "sherlock-beeches-3"
PAPERS = 5
FIRST, LAST = 198, 209
MINUTES = 2

FURNITURE = re.compile(
    r"SHERLOCK HOLMES/\d+/\d+\s+\d+/\d+/\d+\s+\d+:\d+\s+Page \d+"
    r"|\d+\s*SELECTED ADVENTURES OF SHERLOCK HOLMES"
    r"|\d+\s*THE ADVENTURE OF THE COPPER BEECHES")
# Pages 203 and 205 are full-page plates whose captions are set in capitals, and
# page 208 carries a glossary bubble in capitals as well. All three sit in the
# middle of sentences that run across them.
CAPTION = re.compile(u"(?m)^[A-Z\u201c\u2018][A-Z \u2018\u2019\u201c\u201d',\\-\\.!?]{12,}$")
TAG = re.compile(r"</?[a-zA-Z]+ ?/?>")

SECTIONS = [
    ("m1", "Section 1 \u2014 pages 198 to 199",
     "The end of the threat, the wire she sends, and the four things Holmes wants to know", S1),
    ("m2", "Section 2 \u2014 pages 200 to 201",
     "Holmes explains the whole thing, and seven o\u2019clock comes", S2),
    ("m3", "Section 3 \u2014 pages 202 to 205",
     "An empty room, a ladder against the eaves, and a dog that has not been fed", S3),
    ("m4", "Section 4 \u2014 pages 206 to 209",
     "Mrs. Toller tells the rest, and the story ends for everybody in it", S4),
]

ORDER = {
    "m1": ["mastiff", "wire", "plan"],
    "m2": ["impersonate", "child", "seven"],
    "m3": ["empty", "villain", "hound"],
    "m4": ["mrstoller", "alice", "ending"],
}


def bare(s):
    return re.sub(r"[^a-z]", "", s.lower())


def reader():
    """The pages, twice: furniture stripped, and left alone.

    Loaded only as far as LAST. Earlier sections loaded one page past the end so
    that a sentence running over the boundary could still be verified; here the
    page past the end is the author's biography, and quoting that by accident
    should fail rather than pass.
    """
    r = PdfReader(os.path.join(ROOT, "_source", "reading",
                               "CC_SherlockHolmes_Reader_W1.pdf"))
    pages = [r.pages[p + 13 - 1].extract_text() or ""
             for p in range(FIRST - 1, LAST + 1)]
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
    for mid, name, blurb, items in SECTIONS:
        keys = [it["p"] for it in items]
        used |= set(keys)
        if keys != ORDER[mid]:
            bad.append("%s: questions are not in story order \u2014 %s" % (mid, keys))
        if len(items) != 3:
            bad.append("%s: %d questions \u2014 three a section keeps the whole thing "
                       "inside ten minutes" % (mid, len(items)))
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
                    if re.search(r"\bchapter", txt, re.I):
                        bad.append("%s: says chapter in the %s \u2014 these are sections"
                                   % (spot, what))

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

    spare = set(PASSAGES) - used
    if spare:
        bad.append("passages nothing asks about: %s" % ", ".join(sorted(spare)))

    total = len(SECTIONS) * MINUTES
    if total > 10:
        bad.append("the whole section is %d minutes, and a night's homework is ten"
                   % total)
    return bad, quoted, versions


def build():
    bad, quoted, versions = check()
    if bad:
        print("  refusing to write:")
        for b in bad:
            print("    " + b)
        return 1

    missions = [{
        "id": mid,
        "name": name,
        "tag": "%d questions \u00b7 %d papers \u00b7 about %d minutes"
               % (len(items), PAPERS, MINUTES),
        "blurb": blurb,
        "items": items,
    } for mid, name, blurb, items in SECTIONS]

    section = {
        "slug": SLUG,
        "title": "The Empty Room",
        "pages": "198\u2013209",
        "bigQuestion": ("Violet Hunter has told Holmes everything she noticed, "
                        "without knowing what any of it meant. By the end of "
                        "tonight\u2019s reading you know the whole plan \u2014 so who was "
                        "really being kept at the Copper Beeches, why was Miss "
                        "Hunter brought there, and who in that house was quietly "
                        "working against Mr. Rucastle?"),
        "passages": PASSAGES,
        "missions": missions,
    }

    sections = json.load(io.open(OUT, encoding="utf-8")) if os.path.exists(OUT) else []
    sections = [s for s in sections if s["slug"] != SLUG] + [section]
    io.open(OUT, "w", encoding="utf-8", newline="\n").write(
        json.dumps(sections, ensure_ascii=False, indent=1))

    n = sum(len(m["items"]) for m in missions)
    print("  sections_beeches.json  %d sections, newest is %s" % (len(sections), SLUG))
    print("  %d sections of %d, %d questions, %d versions each = %d ways to be asked"
          % (len(missions), n // len(missions), n, PAPERS, versions))
    print("  %d quoted sentences checked against pages %d to %d" % (quoted, FIRST, LAST))
    print("  highlights found, four distinct options each, no answer the longest")
    print("  the story ends on %d, so there is no next page to give away" % LAST)
    print("  %d minutes end to end" % (len(SECTIONS) * MINUTES))
    return 0


sys.exit(build())
