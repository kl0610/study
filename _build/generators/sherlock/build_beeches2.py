# -*- coding: utf-8 -*-
"""Write the pages 185-198 section, or refuse and say why.

Four sections of three questions -- sections, not chapters -- twelve in all,
five versions of each, about eight minutes end to end. Fourteen pages, and the
brief was simply to help the reader follow the story, so the questions stay on
what Miss Hunter saw and what it is evidence of.

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
  no spoilers   nothing from page 199 onwards. This reading stops mid-sentence
                on 198 -- "I would send you a" -- and the word is "wire". Holmes's
                plan for the evening, and what he calls her, are on 199
  budget        twelve questions, four sections, about two minutes each
"""
import io
import json
import os
import re
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)

from beech2_text import PASSAGES
from beech2_q12 import S1, S2
from beech2_q34 import S3, S4

from pypdf import PdfReader

ROOT = r"C:\Users\kl\projects\study"
OUT = os.path.join(ROOT, "_build", "generators", "sections_beeches.json")
SLUG = "sherlock-beeches-2"
PAPERS = 5
FIRST, LAST = 185, 198
MINUTES = 2

FURNITURE = re.compile(
    r"SHERLOCK HOLMES/\d+/\d+\s+\d+/\d+/\d+\s+\d+:\d+\s+Page \d+"
    r"|\d+\s*SELECTED ADVENTURES OF SHERLOCK HOLMES"
    r"|\d+\s*THE ADVENTURE OF THE COPPER BEECHES")
# A caption on these pages can open with a double quote and a single quote
# together -- page 197 is "\u2018OH! I AM SO FRIGHTENED!\u2019 I PANTED." -- and it
# sits in the middle of a sentence that runs from 196 to 198.
CAPTION = re.compile(u"(?m)^[A-Z\u201c\u2018][A-Z \u2018\u2019\u201c\u201d',\\-\\.!]{12,}$")
TAG = re.compile(r"</?[a-zA-Z]+ ?/?>")

# Page 199 and after: Holmes's plan for the evening, and who is behind the door.
# "Toller" is in range -- he is one of the two servants -- so it is not on this
# list; "Mrs. Toller" is, because the reading only ever calls her Toller's wife.
SPOILERS = ["wine cellar", "brave and sensible", "seven o\u2019clock",
            "seven o'clock", "Alice", "Mrs. Toller", "give the alarm"]
B = chr(92) + "b"
SPOIL_RE = [re.compile(B + w.replace(" ", r"\s+") + "s?" + B, re.I) for w in SPOILERS]

SECTIONS = [
    ("m1", "Section 1 \u2014 pages 185 to 186",
     "Two servants, a borrowed dress, and a chair with its back to the window", S1),
    ("m2", "Section 2 \u2014 pages 188 to 190",
     "The piece of broken mirror, the man on the road, and Carlo", S2),
    ("m3", "Section 3 \u2014 pages 191 to 194",
     "Her own hair in a locked drawer, and the wing she may not enter", S3),
    ("m4", "Section 4 \u2014 pages 195 to 198",
     "Behind the barricaded door, and what Rucastle says while he is smiling", S4),
]

ORDER = {
    "m1": ["servants", "dress", "reading"],
    "m2": ["mirror", "blind", "carlo"],
    "m3": ["hair", "wing", "darkroom"],
    "m4": ["barricade", "coaxing", "mastiff"],
}


def bare(s):
    return re.sub(r"[^a-z]", "", s.lower())


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

    spare = set(PASSAGES) - used
    if spare:
        bad.append("passages nothing asks about: %s" % ", ".join(sorted(spare)))

    for key, p in PASSAGES.items():
        body = " ".join(p["text"]) + " " + p["title"]
        for w, rx in zip(SPOILERS, SPOIL_RE):
            if rx.search(body):
                bad.append("passage %s reaches past the reading (%s)" % (key, w))

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
        "title": "The Room at the End of the Passage",
        "pages": "185\u2013198",
        "bigQuestion": ("Violet Hunter is dressed in another woman\u2019s clothes, sat with her back to a window, and made to laugh. Then she finds her own hair in a drawer she has never opened. What has she worked out by the end of tonight\u2019s reading, and what is she still only guessing at?"),
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
    print("  %d quoted sentences checked against the reader" % quoted)
    print("  highlights found, four distinct options each, no answer the longest")
    print("  nothing names what is on page %d, and nothing calls a section a chapter"
          % (LAST + 1))
    print("  %d minutes end to end" % (len(SECTIONS) * MINUTES))
    return 0


sys.exit(build())
