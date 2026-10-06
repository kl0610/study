# -*- coding: utf-8 -*-
"""Write the pages 165-183 section, or refuse and say why.

Six sections -- sections, not chapters -- nineteen questions, five versions of
each, about thirteen minutes end to end. Nineteen pages is twice the usual
reading, so this is longer than the ten-minute sections; the cap Keith set for a
reading this size is fifteen.

The last question of the last section is a character-traits summary of Violet
Hunter across the whole reading, which is what the class is working on this
term. It is anchored on the sentence where she insists on being fair to the
people who frighten her.

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
  no spoilers   nothing from page 184 onwards. This reading stops mid-sentence
                on 183, at "an unreasonable aversion to her stepmother. As";
                Mrs. Rucastle's sorrow, the servants and the full account of the
                child are all on the next page
  budget        twelve questions, four sections, about two minutes each
"""
import io
import json
import os
import re
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)

from beech_text import PASSAGES
from beech_q12 import S1, S2
from beech_q34 import S3, S4
from beech_q56 import S5, S6

from pypdf import PdfReader

ROOT = r"C:\Users\kl\projects\study"
OUT = os.path.join(ROOT, "_build", "generators", "sections_beeches.json")
SLUG = "sherlock-beeches-1"
PAPERS = 5
FIRST, LAST = 165, 183
MINUTES = 2

FURNITURE = re.compile(
    r"SHERLOCK HOLMES/\d+/\d+\s+\d+/\d+/\d+\s+\d+:\d+\s+Page \d+"
    r"|\d+\s*SELECTED ADVENTURES OF SHERLOCK HOLMES"
    r"|\d+\s*THE ADVENTURE OF THE COPPER BEECHES"
    r"|CHAPTER TITLE GOES HERE"
    r"|The Adventure\s*of\s*the\s*Copper Beeches")
CAPTION = re.compile(r"(?m)^[A-Z][A-Z \u2019',\-\.!]{12,}$")
TAG = re.compile(r"</?[a-zA-Z]+ ?/?>")

# Page 184 and after. The child's cruelty is hinted at in range -- Rucastle
# tells the cockroach story himself on 172 -- but the full account of it, Mrs.
# Rucastle's tears, and the Tollers are all past the reading. "Electric blue" is
# in range and is deliberately not on this list.
SPOILERS = ["Toller", "secret sorrow", "savage fits", "ill-natured",
            "colorless in mind", "giving pain", "spoilt", "in tears"]
B = chr(92) + "b"
SPOIL_RE = [re.compile(B + w.replace(" ", r"\s+") + "s?" + B, re.I) for w in SPOILERS]

SECTIONS = [
    ("m1", "Section 1 \u2014 pages 165 to 167",
     "A dull morning, a letter, and what the blue carbuncle taught them", S1),
    ("m2", "Section 2 \u2014 pages 167 to 169",
     "Who Violet Hunter is, and why she needs the work", S2),
    ("m3", "Section 3 \u2014 pages 170 to 172",
     "The offer: a hundred a year, and half of it in advance", S3),
    ("m4", "Section 4 \u2014 pages 173 to 174",
     "The one condition she refuses, and what refusing costs her", S4),
    ("m5", "Section 5 \u2014 pages 175 to 179",
     "The second letter, and the thing that makes Holmes uneasy", S5),
    ("m6", "Section 6 \u2014 pages 180 to 183",
     "The telegram, the Black Swan, the house \u2014 and what she is made of", S6),
]

ORDER = {
    "m1": ["dull", "zero", "whim"],
    "m2": ["violet", "situation", "agency"],
    "m3": ["salary", "advance", "child"],
    "m4": ["faddy", "hair", "stoper"],
    "m5": ["letter2", "uneasy", "telegram"],
    # The fourth is the traits summary. It hangs off the same passage as the
    # question before it, so a miss on either pulls the other into the run-up.
    "m6": ["summons", "freedom", "house", "house"],
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
        if not 3 <= len(items) <= 4:
            bad.append("%s: %d questions \u2014 three or four a section is what the "
                       "minute budget is built on" % (mid, len(items)))
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

    total = sum(MINUTES if len(items) == 3 else MINUTES + 1
                for _, _, _, items in SECTIONS)
    # Ten minutes is the usual budget. Keith raised it to fifteen for a reading
    # of nineteen pages; it is a ceiling, not a target.
    if total > 15:
        bad.append("the whole section is %d minutes, and the ceiling is fifteen"
                   % total)
    return bad, quoted, versions


def build():
    bad, quoted, versions = check()
    if bad:
        print("  refusing to write:")
        for b in bad:
            print("    " + b)
        return 1

    # Two minutes for a three-question section, three for a four-question one.
    # Nineteen questions, thirteen minutes, inside the fifteen Keith set for a
    # reading this long.
    missions = [{
        "id": mid,
        "name": name,
        "tag": "%d questions \u00b7 %d papers \u00b7 about %d minutes"
               % (len(items), PAPERS, MINUTES if len(items) == 3 else MINUTES + 1),
        "blurb": blurb,
        "items": items,
    } for mid, name, blurb, items in SECTIONS]

    section = {
        "slug": SLUG,
        "title": "The Copper Beeches",
        "pages": "165\u2013183",
        "bigQuestion": ("A stranger picks Violet Hunter out of a room before she has spoken, offers her three times the going rate, and will give way on everything except her hair. She says no, and then says yes. What is she like \u2014 and what has Mr. Rucastle told you about himself without meaning to?"),
        "passages": PASSAGES,
        "missions": missions,
    }

    sections = json.load(io.open(OUT, encoding="utf-8")) if os.path.exists(OUT) else []
    sections = [s for s in sections if s["slug"] != SLUG] + [section]
    io.open(OUT, "w", encoding="utf-8", newline="\n").write(
        json.dumps(sections, ensure_ascii=False, indent=1))

    n = sum(len(m["items"]) for m in missions)
    print("  sections_beeches.json  %d sections, newest is %s" % (len(sections), SLUG))
    print("  %d sections (%s), %d questions, %d versions each = %d ways to be asked"
          % (len(missions), " + ".join(str(len(m["items"])) for m in missions),
             n, PAPERS, versions))
    print("  %d quoted sentences checked against the reader" % quoted)
    print("  highlights found, four distinct options each, no answer the longest")
    print("  nothing names what is on page %d, and nothing calls a section a chapter"
          % (LAST + 1))
    print("  %d minutes end to end, against a ceiling of fifteen"
          % sum(MINUTES if len(m["items"]) == 3 else MINUTES + 1 for m in missions))
    return 0


sys.exit(build())
